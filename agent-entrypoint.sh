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
# Strip accidental surrounding quotes (e.g. ECS console saves `"openrouter/..."` literally)
AGENT_MODEL="$(echo "${AGENT_MODEL:-openrouter/qwen/qwen3.6-plus:free}" | tr -d '"')"

# Optional API keys — default to empty to satisfy nounset
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}"
GEMINI_API_KEY="${GEMINI_API_KEY:-}"
OPENROUTER_API_KEY="${OPENROUTER_API_KEY:-}"

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
"I'm the Finance Agent — I only handle financial analysis, budgets, and reporting."
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
"I'm the Marketing Agent — I handle campaigns, content, and growth."
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
"I'm the Operations Agent — I handle tasks, workflows, and team coordination."
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
      echo "ERROR: Unknown AGENT_TYPE '${AGENT_TYPE}' — no role files written" >&2
      exit 1
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

# Strip accidental whitespace and surrounding quotes from keys
# (ECS console sometimes saves values as `"sk-or-..."` with literal quotes)
ANTHROPIC_API_KEY="$(echo "${ANTHROPIC_API_KEY}" | tr -d ' \t\r\n"')"
GEMINI_API_KEY="$(echo "${GEMINI_API_KEY}" | tr -d ' \t\r\n"')"
OPENROUTER_API_KEY="$(echo "${OPENROUTER_API_KEY}" | tr -d ' \t\r\n"')"

echo "DEBUG [keys] ANTHROPIC_API_KEY=$([ -n "${ANTHROPIC_API_KEY}" ] && echo 'SET' || echo 'UNSET')"
echo "DEBUG [keys] GEMINI_API_KEY=$([ -n "${GEMINI_API_KEY}" ] && echo 'SET' || echo 'UNSET')"
echo "DEBUG [keys] OPENROUTER_API_KEY=$([ -n "${OPENROUTER_API_KEY}" ] && echo 'SET' || echo 'UNSET')"

# ── Provider fallback ─────────────────────────────────────────────────────────
# If the primary provider's key is absent, auto-select an available one so the
# container doesn't start in a permanently broken state.
EFFECTIVE_AGENT_MODEL="${AGENT_MODEL}"
EFFECTIVE_PROVIDER="${AGENT_PROVIDER}"

if [ "${AGENT_PROVIDER}" = "anthropic" ] && [ -z "${ANTHROPIC_API_KEY}" ]; then
  if [ -n "${OPENROUTER_API_KEY}" ]; then
    EFFECTIVE_AGENT_MODEL="openrouter/${AGENT_MODEL}"
    EFFECTIVE_PROVIDER="openrouter"
    echo "WARNING: ANTHROPIC_API_KEY missing — falling back to OpenRouter: ${EFFECTIVE_AGENT_MODEL}"
  elif [ -n "${GEMINI_API_KEY}" ]; then
    EFFECTIVE_AGENT_MODEL="google/gemini-2.0-flash"
    EFFECTIVE_PROVIDER="google"
    echo "WARNING: ANTHROPIC_API_KEY missing — falling back to Google: ${EFFECTIVE_AGENT_MODEL}"
  else
    echo "WARNING: No valid API key found for any provider — container will likely fail"
  fi
elif [ "${AGENT_PROVIDER}" = "google" ] && [ -z "${GEMINI_API_KEY}" ]; then
  if [ -n "${OPENROUTER_API_KEY}" ]; then
    EFFECTIVE_AGENT_MODEL="openrouter/google/${MODEL_ID}"
    EFFECTIVE_PROVIDER="openrouter"
    echo "WARNING: GEMINI_API_KEY missing — falling back to OpenRouter: ${EFFECTIVE_AGENT_MODEL}"
  elif [ -n "${ANTHROPIC_API_KEY}" ]; then
    EFFECTIVE_AGENT_MODEL="anthropic/claude-haiku-4-5-20251001"
    EFFECTIVE_PROVIDER="anthropic"
    echo "WARNING: GEMINI_API_KEY missing — falling back to Anthropic: ${EFFECTIVE_AGENT_MODEL}"
  fi
elif [ "${AGENT_PROVIDER}" = "openrouter" ] && [ -z "${OPENROUTER_API_KEY}" ]; then
  if [ -n "${ANTHROPIC_API_KEY}" ]; then
    EFFECTIVE_AGENT_MODEL="anthropic/claude-haiku-4-5-20251001"
    EFFECTIVE_PROVIDER="anthropic"
    echo "WARNING: OPENROUTER_API_KEY missing — falling back to Anthropic: ${EFFECTIVE_AGENT_MODEL}"
  elif [ -n "${GEMINI_API_KEY}" ]; then
    EFFECTIVE_AGENT_MODEL="google/gemini-2.0-flash"
    EFFECTIVE_PROVIDER="google"
    echo "WARNING: OPENROUTER_API_KEY missing — falling back to Google: ${EFFECTIVE_AGENT_MODEL}"
  else
    echo "WARNING: No valid API key found for any provider — container will likely fail"
  fi
fi

# Recompute MODEL_ID after fallback (effective model may have changed)
EFFECTIVE_MODEL_ID=$(echo "${EFFECTIVE_AGENT_MODEL}" | cut -d'/' -f2-)

echo "DEBUG [fallback] EFFECTIVE_PROVIDER=${EFFECTIVE_PROVIDER} | EFFECTIVE_AGENT_MODEL=${EFFECTIVE_AGENT_MODEL} | EFFECTIVE_MODEL_ID=${EFFECTIVE_MODEL_ID}"

# ── Build per-provider model arrays ──────────────────────────────────────────
# Anthropic: only register a model when anthropic is the effective provider
if [ "${EFFECTIVE_PROVIDER}" = "anthropic" ] && [ -n "${ANTHROPIC_API_KEY}" ]; then
  ANTHROPIC_MODELS='[{"id":"'"${EFFECTIVE_MODEL_ID}"'","name":"'"${MODEL_NAME}"'","reasoning":false,"input":["text"],"cost":{"input":0,"output":0,"cacheRead":0,"cacheWrite":0},"contextWindow":200000,"maxTokens":8192}]'
elif [ -n "${ANTHROPIC_API_KEY}" ]; then
  ANTHROPIC_MODELS='[{"id":"claude-haiku-4-5-20251001","name":"Claude Haiku","reasoning":false,"input":["text"],"cost":{"input":0,"output":0,"cacheRead":0,"cacheWrite":0},"contextWindow":200000,"maxTokens":8192}]'
else
  ANTHROPIC_MODELS='[]'
fi

# Google: always gemini-2.0-flash when key is present
if [ -n "${GEMINI_API_KEY}" ]; then
  GOOGLE_MODELS='[{"id":"gemini-2.0-flash","name":"Gemini Flash","reasoning":false,"input":["text"],"cost":{"input":0,"output":0,"cacheRead":0,"cacheWrite":0},"contextWindow":1000000,"maxTokens":8192}]'
else
  GOOGLE_MODELS='[]'
fi

# OpenRouter: include defaults + the effective model if it's an openrouter model
if [ -n "${OPENROUTER_API_KEY}" ]; then
  OPENROUTER_MODELS='[{"id":"anthropic/claude-haiku-4-5-20251001","name":"Claude Haiku (OpenRouter)","reasoning":false,"input":["text"],"cost":{"input":0,"output":0,"cacheRead":0,"cacheWrite":0},"contextWindow":200000,"maxTokens":8192},{"id":"google/gemini-flash-1.5","name":"Gemini Flash (OpenRouter)","reasoning":false,"input":["text"],"cost":{"input":0,"output":0,"cacheRead":0,"cacheWrite":0},"contextWindow":1000000,"maxTokens":8192}'
  # Append the effective model if it's routed through openrouter and not already a default
  if [ "${EFFECTIVE_PROVIDER}" = "openrouter" ] \
     && [ "${EFFECTIVE_MODEL_ID}" != "anthropic/claude-haiku-4-5-20251001" ] \
     && [ "${EFFECTIVE_MODEL_ID}" != "google/gemini-flash-1.5" ]; then
    OR_MODEL_NAME=$(echo "${EFFECTIVE_MODEL_ID##*/}" | sed 's/[:].*//' | sed 's/-/ /g' | sed 's/\b\(.\)/\u\1/g')
    OPENROUTER_MODELS="${OPENROUTER_MODELS}"',{"id":"'"${EFFECTIVE_MODEL_ID}"'","name":"'"${OR_MODEL_NAME}"' (OpenRouter)","reasoning":false,"input":["text"],"cost":{"input":0,"output":0,"cacheRead":0,"cacheWrite":0},"contextWindow":128000,"maxTokens":8192}'
    echo "DEBUG [models] Added dynamic OpenRouter model: ${EFFECTIVE_MODEL_ID} (${OR_MODEL_NAME})"
  fi
  OPENROUTER_MODELS="${OPENROUTER_MODELS}]"
else
  OPENROUTER_MODELS='[]'
fi

echo "DEBUG [models] anthropic=$(echo "${ANTHROPIC_MODELS}" | grep -co '"id"' || echo 0) model(s)"
echo "DEBUG [models] google=$(echo "${GOOGLE_MODELS}" | grep -co '"id"' || echo 0) model(s)"
echo "DEBUG [models] openrouter=$(echo "${OPENROUTER_MODELS}" | grep -co '"id"' || echo 0) model(s)"

cat > "${CONFIG_FILE}.tmp" << EOJSON
{
  "models": {
    "providers": {
      "anthropic": {
        "apiKey": "${ANTHROPIC_API_KEY}",
        "baseUrl": "https://api.anthropic.com",
        "models": ${ANTHROPIC_MODELS}
      },
      "google": {
        "apiKey": "${GEMINI_API_KEY}",
        "baseUrl": "https://generativelanguage.googleapis.com/v1beta",
        "models": ${GOOGLE_MODELS}
      },
      "openrouter": {
        "apiKey": "${OPENROUTER_API_KEY}",
        "baseUrl": "https://openrouter.ai/api/v1",
        "models": ${OPENROUTER_MODELS}
      }
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

exec openclaw gateway --bind lan --port 18789 --allow-unconfigured
