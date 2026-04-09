#!/bin/bash
set -Eeuo pipefail
IFS=$'\n\t'
trap 'echo "ERROR: entrypoint failed at line ${LINENO} — aborting" >&2' ERR

export HOME="${HOME:-/home/node}"

# ── Mode check ────────────────────────────────────────────────────────────────
case "${OPENCLAW_MODE:-agent}" in
  whatsapp_link)
    exec /home/node/whatsapp-linker.sh
    ;;
  agent) ;;   # normal path — continue
  *)
    echo "ERROR: Unknown OPENCLAW_MODE '${OPENCLAW_MODE:-}'" >&2
    exit 1
    ;;
esac

# ── Upfront input validation ──────────────────────────────────────────────────
for _var in AGENT_ID AGENT_TYPE GATEWAY_TOKEN; do
  if [ -z "${!_var:-}" ]; then
    echo "ERROR: required env var ${_var} is not set" >&2
    exit 1
  fi
done

for _tool in python3 openclaw; do
  if ! command -v "${_tool}" >/dev/null 2>&1; then
    echo "ERROR: required tool '${_tool}' not found in PATH" >&2
    exit 1
  fi
done

OPENCLAW_HOME="${OPENCLAW_HOME:-/home/node/.openclaw}"
CONFIG_FILE="${OPENCLAW_HOME}/openclaw.json"
WORKSPACE="${OPENCLAW_HOME}/workspace"
AUTH_DIR="${OPENCLAW_HOME}/agents/main/agent"

mkdir -p "${OPENCLAW_HOME}" "${WORKSPACE}" "${AUTH_DIR}"

SYSTEM_PROMPT="${SYSTEM_PROMPT:-You are a helpful AI assistant.}"

# ── Fetch full system prompt from domain API (avoids ECS 8192-byte env var limit) ──
if [ -n "${WEBHOOK_BASE_URL:-}" ]; then
  FETCHED_PROMPT=""
  for _attempt in 1 2 3 4 5; do
    FETCHED_PROMPT=$(curl -sf -H "Authorization: Bearer ${GATEWAY_TOKEN}" \
      "${WEBHOOK_BASE_URL}/api/internal/agents/${AGENT_ID}/config" \
      | python3 -c "import sys,json; print(json.load(sys.stdin)['systemPrompt'])" 2>/dev/null) && break
    echo "Attempt ${_attempt}: waiting for domain API..." >&2
    sleep 3
  done
  if [ -n "${FETCHED_PROMPT}" ]; then
    SYSTEM_PROMPT="${FETCHED_PROMPT}"
    echo "DEBUG [config] Fetched system prompt from domain API (${#SYSTEM_PROMPT} bytes)"
  else
    echo "WARNING: Could not fetch config from domain API — using env SYSTEM_PROMPT fallback" >&2
  fi
fi

# Strip accidental surrounding quotes (e.g. ECS console saves `"openrouter/..."` literally)
AGENT_MODEL="$(echo "${AGENT_MODEL:-openrouter/qwen/qwen3.6-plus:free}" | tr -d '"')"

# Optional API keys — default to empty to satisfy nounset
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}"
GEMINI_API_KEY="${GEMINI_API_KEY:-}"
OPENROUTER_API_KEY="${OPENROUTER_API_KEY:-}"
OPENAI_API_KEY="${OPENAI_API_KEY:-}"
MISTRAL_API_KEY="${MISTRAL_API_KEY:-}"
GROQ_API_KEY="${GROQ_API_KEY:-}"
XAI_API_KEY="${XAI_API_KEY:-}"
DEEPSEEK_API_KEY="${DEEPSEEK_API_KEY:-}"
COHERE_API_KEY="${COHERE_API_KEY:-}"
TOGETHER_API_KEY="${TOGETHER_API_KEY:-}"
PERPLEXITY_API_KEY="${PERPLEXITY_API_KEY:-}"

# Write SYSTEM.md always (system prompt can legitimately change per deployment)
cat > "${WORKSPACE}/SYSTEM.md" << EOSYSTEM
${SYSTEM_PROMPT}
EOSYSTEM

# ── Role files: only write on FIRST launch ──────────────────
# If SOUL.md already exists on EFS, this is a restart — preserve it
if [ ! -f "${WORKSPACE}/SOUL.md" ]; then
  echo "First launch — writing role files for ${AGENT_TYPE}"

  case "${AGENT_TYPE}" in
    "finance")
      cat > "${WORKSPACE}/SOUL.md" << 'EOF'
# Identity
You are FinBot, the Finance Agent.
# Personality
- Professional, precise, data-driven
- Use financial terminology (EBITDA, cash flow, P&L, burn rate)
- Format reports in structured tables
# Hard Boundaries
You ONLY handle finance. If asked about anything else respond:
"I'm the Finance Agent, I only handle financial analysis, budgets, and reporting."
EOF
      cat > "${WORKSPACE}/AGENTS.md" << 'EOF'
# Rules
- ONLY respond to: expenses, revenue, forecasting, cash flow, invoices, P&L
- FORBIDDEN: marketing content, ops tasks, anything non-financial
EOF
      cat > "${WORKSPACE}/IDENTITY.md" << 'EOF'
name: FinBot
emoji: 📊
role: Finance Agent
EOF
      ;;
    "marketing")
      cat > "${WORKSPACE}/SOUL.md" << 'EOF'
# Identity
You are MktBot, the Marketing Agent.
# Personality
- Creative, growth-focused, data-informed
- Use marketing terminology (ROAS, CTR, CAC, funnel)
# Hard Boundaries
You ONLY handle marketing. If asked about anything else respond:
"I'm the Marketing Agent, I handle campaigns, content, and growth."
EOF
      cat > "${WORKSPACE}/AGENTS.md" << 'EOF'
# Rules
- ONLY respond to: campaigns, content, SEO, social media, metrics, drafts
- FORBIDDEN: financial calculations, ops management
EOF
      cat > "${WORKSPACE}/IDENTITY.md" << 'EOF'
name: MktBot
emoji: 📣
role: Marketing Agent
EOF
      ;;
    "operations")
      cat > "${WORKSPACE}/SOUL.md" << 'EOF'
# Identity
You are OpsBot, the Operations Agent.
# Personality
- Action-oriented, concise, structured
- Use ops terminology (standup, sprint, blockers, SLA)
# Hard Boundaries
You ONLY handle operations. If asked about anything else respond:
"I'm the Operations Agent, I handle tasks, workflows, and team coordination."
EOF
      cat > "${WORKSPACE}/AGENTS.md" << 'EOF'
# Rules
- ONLY respond to: tasks, standups, assignments, workflows, team coordination
- FORBIDDEN: financial reports, marketing content
EOF
      cat > "${WORKSPACE}/IDENTITY.md" << 'EOF'
name: OpsBot
emoji: ⚙️
role: Operations Agent
EOF
      ;;
    *)
      # Custom/dynamic agent type — derive generic role files from AGENT_TYPE
      # The full domain config is already in SYSTEM_PROMPT (generated server-side)
      PRETTY_TYPE="$(echo "${AGENT_TYPE}" | sed 's/[-_]/ /g' | sed 's/\b\(.\)/\u\1/g')"
      cat > "${WORKSPACE}/SOUL.md" << EOF
# Identity
You are a specialized ${PRETTY_TYPE} Agent.
# Personality
- Professional, knowledgeable, focused on ${AGENT_TYPE}
# Hard Boundaries
You ONLY handle ${AGENT_TYPE}-related topics. If asked about anything else respond:
"I'm the ${PRETTY_TYPE} Agent, I only handle ${AGENT_TYPE}-related tasks."
EOF
      cat > "${WORKSPACE}/AGENTS.md" << EOF
# Rules
- ONLY respond to topics related to: ${AGENT_TYPE}
- Stay within your domain of expertise
EOF
      cat > "${WORKSPACE}/IDENTITY.md" << EOF
name: ${PRETTY_TYPE}Bot
emoji: 🤖
role: ${PRETTY_TYPE} Agent
EOF
      ;;
  esac

  cat > "${WORKSPACE}/TOOLS.md" << 'EOF'
# Available Tools
- web_search: search the internet for current information
- file_reader: read files from the workspace
# Convention
Only use tools relevant to your role.
EOF
fi

# MEMORY.md: only create if absent — EFS preserves it across restarts
if [ ! -f "${WORKSPACE}/MEMORY.md" ]; then
  cat > "${WORKSPACE}/MEMORY.md" << 'EOF'
# Long-term Memory
This file contains important facts about this user that should persist across all sessions.
EOF
fi

AGENT_PROVIDER=$(echo "${AGENT_MODEL}" | cut -d'/' -f1)
MODEL_ID=$(echo "${AGENT_MODEL}" | cut -d'/' -f2-)
MODEL_NAME=$(echo "${MODEL_ID##*/}" | sed 's/[:].*//' | sed 's/-/ /g' | sed 's/\b\(.\)/\u\1/g')
OC_VERSION=$(openclaw --version 2>/dev/null | grep -Eo '[0-9.]+' | head -1 || echo "2026.3.13")
OC_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

echo "DEBUG [parse] AGENT_MODEL=${AGENT_MODEL}"
echo "DEBUG [parse] AGENT_PROVIDER=${AGENT_PROVIDER} | MODEL_ID=${MODEL_ID} | MODEL_NAME=${MODEL_NAME}"

# Strip accidental whitespace and surrounding quotes from all keys
# (ECS console sometimes saves values as `"sk-or-..."` with literal quotes)
for _kvar in ANTHROPIC_API_KEY GEMINI_API_KEY OPENROUTER_API_KEY OPENAI_API_KEY \
             MISTRAL_API_KEY GROQ_API_KEY XAI_API_KEY DEEPSEEK_API_KEY \
             COHERE_API_KEY TOGETHER_API_KEY PERPLEXITY_API_KEY; do
  eval "${_kvar}=\"\$(echo \"\${${_kvar}}\" | tr -d ' \t\r\n\"')\""
  eval "_v=\"\${${_kvar}}\""
  echo "DEBUG [keys] ${_kvar}=$([ -n "${_v}" ] && echo 'SET' || echo 'UNSET')"
done

# ── Provider registry ─────────────────────────────────────────────────────────
# Maps provider slug -> env var name : base URL
# All non-Anthropic/Google providers use OpenAI-compatible endpoints.
declare -A PROVIDER_KEY_MAP=(
  [anthropic]="ANTHROPIC_API_KEY"
  [google]="GEMINI_API_KEY"
  [openrouter]="OPENROUTER_API_KEY"
  [openai]="OPENAI_API_KEY"
  [mistral]="MISTRAL_API_KEY"
  [groq]="GROQ_API_KEY"
  [xai]="XAI_API_KEY"
  [deepseek]="DEEPSEEK_API_KEY"
  [cohere]="COHERE_API_KEY"
  [together]="TOGETHER_API_KEY"
  [perplexity]="PERPLEXITY_API_KEY"
)

declare -A PROVIDER_BASE_URL=(
  [anthropic]="https://api.anthropic.com"
  [google]="https://generativelanguage.googleapis.com/v1beta"
  [openrouter]="https://openrouter.ai/api/v1"
  [openai]="https://api.openai.com/v1"
  [mistral]="https://api.mistral.ai/v1"
  [groq]="https://api.groq.com/openai/v1"
  [xai]="https://api.x.ai/v1"
  [deepseek]="https://api.deepseek.com/v1"
  [cohere]="https://api.cohere.com/v2"
  [together]="https://api.together.xyz/v1"
  [perplexity]="https://api.perplexity.ai"
)

# Default context windows per provider (used for model registration)
declare -A PROVIDER_CTX_WINDOW=(
  [anthropic]=200000  [google]=1000000 [openrouter]=128000
  [openai]=128000     [mistral]=128000 [groq]=131072
  [xai]=131072        [deepseek]=64000 [cohere]=128000
  [together]=128000   [perplexity]=128000
)

# ── Provider fallback ─────────────────────────────────────────────────────────
EFFECTIVE_AGENT_MODEL="${AGENT_MODEL}"
EFFECTIVE_PROVIDER="${AGENT_PROVIDER}"

# Check if the primary provider's key is present
PRIMARY_KEY_VAR="${PROVIDER_KEY_MAP[${AGENT_PROVIDER}]:-}"
PRIMARY_KEY_VAL=""
if [ -n "${PRIMARY_KEY_VAR}" ]; then
  eval "PRIMARY_KEY_VAL=\"\${${PRIMARY_KEY_VAR}:-}\""
fi

if [ -z "${PRIMARY_KEY_VAL}" ]; then
  echo "WARNING: ${PRIMARY_KEY_VAR:-???} is not set for provider ${AGENT_PROVIDER}"
  # Try fallbacks in order: openrouter, anthropic, google
  if [ -n "${OPENROUTER_API_KEY}" ]; then
    EFFECTIVE_AGENT_MODEL="openrouter/${AGENT_MODEL}"
    EFFECTIVE_PROVIDER="openrouter"
    echo "WARNING: Falling back to OpenRouter: ${EFFECTIVE_AGENT_MODEL}"
  elif [ -n "${ANTHROPIC_API_KEY}" ]; then
    EFFECTIVE_AGENT_MODEL="anthropic/claude-haiku-4-5-20251001"
    EFFECTIVE_PROVIDER="anthropic"
    echo "WARNING: Falling back to Anthropic: ${EFFECTIVE_AGENT_MODEL}"
  elif [ -n "${GEMINI_API_KEY}" ]; then
    EFFECTIVE_AGENT_MODEL="google/gemini-2.0-flash"
    EFFECTIVE_PROVIDER="google"
    echo "WARNING: Falling back to Google: ${EFFECTIVE_AGENT_MODEL}"
  else
    echo "WARNING: No valid API key found for any provider — container will likely fail"
  fi
fi

EFFECTIVE_MODEL_ID=$(echo "${EFFECTIVE_AGENT_MODEL}" | cut -d'/' -f2-)

echo "DEBUG [fallback] EFFECTIVE_PROVIDER=${EFFECTIVE_PROVIDER} | EFFECTIVE_AGENT_MODEL=${EFFECTIVE_AGENT_MODEL} | EFFECTIVE_MODEL_ID=${EFFECTIVE_MODEL_ID}"

# ── Build provider config JSON dynamically ────────────────────────────────────
# Helper: create a model entry JSON
make_model_entry() {
  local id="$1" name="$2" ctx="${3:-128000}"
  echo '{"id":"'"${id}"'","name":"'"${name}"'","reasoning":false,"input":["text"],"cost":{"input":0,"output":0,"cacheRead":0,"cacheWrite":0},"contextWindow":'"${ctx}"',"maxTokens":8192}'
}

PROVIDERS_JSON=""

for provider in "${!PROVIDER_KEY_MAP[@]}"; do
  key_var="${PROVIDER_KEY_MAP[$provider]}"
  eval "key_val=\"\${${key_var}:-}\""
  base_url="${PROVIDER_BASE_URL[$provider]:-}"
  ctx="${PROVIDER_CTX_WINDOW[$provider]:-128000}"

  if [ -z "${key_val}" ]; then
    # No key — register provider with empty models so config is valid
    models_arr="[]"
  elif [ "${provider}" = "${EFFECTIVE_PROVIDER}" ]; then
    # This is the active provider — register the effective model
    entry_name=$(echo "${EFFECTIVE_MODEL_ID##*/}" | sed 's/[:].*//' | sed 's/-/ /g' | sed 's/\b\(.\)/\u\1/g')
    models_arr="[$(make_model_entry "${EFFECTIVE_MODEL_ID}" "${entry_name}" "${ctx}")]"
    echo "DEBUG [models] ${provider}: registered ${EFFECTIVE_MODEL_ID}"
  else
    # Provider has a key but isn't the active one — register a sensible default
    case "${provider}" in
      anthropic)   def_id="claude-haiku-4-5-20251001"; def_name="Claude Haiku" ;;
      google)      def_id="gemini-2.0-flash";          def_name="Gemini Flash" ;;
      openrouter)  def_id="anthropic/claude-haiku-4-5-20251001"; def_name="Claude Haiku (OR)" ;;
      openai)      def_id="gpt-4o-mini";               def_name="GPT-4o Mini" ;;
      groq)        def_id="llama-3.3-70b-versatile";   def_name="Llama 3.3 70B" ;;
      mistral)     def_id="mistral-small-latest";      def_name="Mistral Small" ;;
      xai)         def_id="grok-3-mini-fast";          def_name="Grok 3 Mini Fast" ;;
      deepseek)    def_id="deepseek-chat";             def_name="DeepSeek Chat" ;;
      *)           def_id="default";                   def_name="Default" ;;
    esac
    models_arr="[$(make_model_entry "${def_id}" "${def_name}" "${ctx}")]"
  fi

  [ -n "${PROVIDERS_JSON}" ] && PROVIDERS_JSON="${PROVIDERS_JSON},"
  PROVIDERS_JSON="${PROVIDERS_JSON}
      \"${provider}\": {
        \"apiKey\": \"${key_val}\",
        \"baseUrl\": \"${base_url}\",
        \"models\": ${models_arr}
      }"
done

cat > "${CONFIG_FILE}.tmp" << EOJSON
{
  "models": {
    "providers": {${PROVIDERS_JSON}
    }
  },
  "agents": {
    "defaults": {
      "model": { "primary": "${EFFECTIVE_AGENT_MODEL}" },
      "workspace": "${WORKSPACE}",
      "skipBootstrap": true,
      "compaction": { "mode": "safeguard" }
    }
  },
  "commands": {
    "native": "auto",
    "nativeSkills": "auto",
    "restart": true,
    "ownerDisplay": "raw"
  },
  "gateway": {
    "mode": "local",
    "bind": "lan",
    "port": 18789,
    "controlUi": {
      "dangerouslyAllowHostHeaderOriginFallback": true
    },
    "auth": { "token": "${GATEWAY_TOKEN}" },
    "http": { "endpoints": { "responses": { "enabled": true } } }
  },
  "meta": {
    "lastTouchedVersion": "${OC_VERSION}",
    "lastTouchedAt": "${OC_TIMESTAMP}"
  }
}
EOJSON
mv "${CONFIG_FILE}.tmp" "${CONFIG_FILE}"
chmod 600 "${CONFIG_FILE}"

echo "DEBUG [config] openclaw.json written successfully"
echo "DEBUG [config] primary model = ${EFFECTIVE_AGENT_MODEL}"
echo "OpenClaw agent starting | id=${AGENT_ID} type=${AGENT_TYPE} provider=${EFFECTIVE_PROVIDER}"

export OPENCLAW_CONFIG_PATH="${CONFIG_FILE}"

# ── Channels, MCP, and auth profiles ─────────────────────────────────────────
# agent-config.py handles: Discord/WhatsApp/MCP patches to openclaw.json,
# and validated auth-profiles.json writing.
python3 /home/node/agent-config.py "${CONFIG_FILE}" "${AUTH_DIR}/auth-profiles.json"

# Stream OpenClaw's internal log file to stdout so all channel logs (including
# WhatsApp) are visible in CloudWatch — the log file is not stdout by default.
mkdir -p /tmp/openclaw
(
  set +e  # errors inside this background subshell must not fire the parent ERR trap
  logfile="/tmp/openclaw/openclaw-$(date -u +%Y-%m-%d).log"
  # Wait up to 30s for OpenClaw to create the log file, then follow it
  for _i in $(seq 1 30); do
    [ -f "${logfile}" ] && break
    sleep 1
  done
  if [ -f "${logfile}" ]; then
    tail -f "${logfile}" 2>/dev/null || true
  fi
) &

# ── WhatsApp relay ────────────────────────────────────────────────────────────
# When WHATSAPP_INBOUND_WEBHOOK_URL is set, start the Baileys relay that forwards
# inbound messages to Next.js and sends replies, bypassing OpenClaw's AI for
# message handling. agent-config.py already skipped adding WhatsApp to openclaw.json.
if [ -n "${WHATSAPP_INBOUND_WEBHOOK_URL:-}" ] && [ -n "${WHATSAPP_ENABLED:-}" ]; then
  echo "Starting WhatsApp relay → ${WHATSAPP_INBOUND_WEBHOOK_URL}"
  node /home/node/whatsapp-relay.mjs &
  RELAY_PID=$!
  echo "WhatsApp relay started (PID ${RELAY_PID})"
fi

exec openclaw gateway --bind lan --port 18789 --allow-unconfigured
