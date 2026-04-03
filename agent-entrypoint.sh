#!/bin/bash
set -e

export HOME="${HOME:-/home/node}"

# ── WhatsApp linker mode ───────────────────────────────────────────────────────
if [ "${OPENCLAW_MODE}" = "whatsapp_link" ]; then
  exec /home/node/whatsapp-linker.sh
fi

OPENCLAW_HOME="${OPENCLAW_HOME:-/home/node/.openclaw}"
DEFAULT_OC_DIR="/home/node/.openclaw"
CONFIG_FILE="${DEFAULT_OC_DIR}/openclaw.json"
WORKSPACE="${OPENCLAW_HOME}/workspace"

echo "Starting OpenClaw agent: ${AGENT_ID} (${AGENT_TYPE})"
echo "HOME=${HOME} CONFIG_FILE=${CONFIG_FILE} WORKSPACE=${WORKSPACE}"

mkdir -p "${OPENCLAW_HOME}"
mkdir -p "${DEFAULT_OC_DIR}"
mkdir -p "${WORKSPACE}"

SYSTEM_PROMPT="${SYSTEM_PROMPT:-You are a helpful AI assistant.}"
AGENT_MODEL="${AGENT_MODEL:-anthropic/claude-haiku-4-5-20251001}"

# Write SYSTEM.md always (system prompt can legitimately change per deployment)
cat > "${WORKSPACE}/SYSTEM.md" << EOSYSTEM
${SYSTEM_PROMPT}
EOSYSTEM

# ── Role files: only write on FIRST launch ──────────────────
# If SOUL.md already exists on EFS, this is a restart — preserve it
if [ ! -f "${WORKSPACE}/SOUL.md" ]; then
  echo "First launch — writing role files for ${AGENT_TYPE}"

  case "$AGENT_TYPE" in
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
MODEL_NAME=$(echo "${MODEL_ID##*/}" | sed 's/-/ /g' | sed 's/\b\(.\)/\u\1/g')
OC_VERSION=$(openclaw --version 2>/dev/null | grep -oP '[\d.]+' | head -1 || echo "2026.3.13")
OC_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

cat > "${CONFIG_FILE}" << EOJSON
{
  "models": {
    "providers": {
      "anthropic": {
        "apiKey": "${ANTHROPIC_API_KEY}",
        "baseUrl": "https://api.anthropic.com",
        "models": $([ "${AGENT_PROVIDER}" = "anthropic" ] && echo '[{"id":"'"${MODEL_ID}"'","name":"'"${MODEL_NAME}"'","reasoning":false,"input":["text"],"cost":{"input":0,"output":0,"cacheRead":0,"cacheWrite":0},"contextWindow":200000,"maxTokens":8192}]' || echo '[]')
      },
      "google": {
        "apiKey": "${GEMINI_API_KEY}",
        "baseUrl": "https://generativelanguage.googleapis.com/v1beta",
        "models": $([ "${AGENT_PROVIDER}" = "google" ] && echo '[{"id":"'"${MODEL_ID}"'","name":"'"${MODEL_NAME}"'","reasoning":false,"input":["text"],"cost":{"input":0,"output":0,"cacheRead":0,"cacheWrite":0},"contextWindow":1000000,"maxTokens":8192}]' || echo '[]')
      }
    }
  },
  "agents": {
    "defaults": {
      "model": { "primary": "${AGENT_MODEL}" },
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

# ── Discord channel ───────────────────────────────────────────────────────────
if [ -n "${DISCORD_BOT_TOKEN}" ]; then
  echo "Adding Discord channel config..."
  python3 - "${CONFIG_FILE}" "${DISCORD_BOT_TOKEN}" << 'PYEOF'
import json, sys
path = sys.argv[1]
token = sys.argv[2]
with open(path) as f:
    cfg = json.load(f)
cfg.setdefault("channels", {})["discord"] = {
    "enabled": True,
    "token": token,
    "dmPolicy": "open",
    "allowFrom": ["*"],
    "execApprovals": {
        "enabled": true
    }
}
with open(path, "w") as f:
    json.dump(cfg, f, indent=2)
PYEOF
  echo "Discord channel configured."
fi

# ── WhatsApp channel (Baileys / QR-based) ────────────────────────────────────
# Credentials live on EFS (written by the whatsapp-linker task).
# We only need to enable the channel in openclaw.json so the gateway picks them up.
if [ -n "${WHATSAPP_ENABLED}" ]; then
  echo "Adding WhatsApp channel config (Baileys)..."
  python3 - "${CONFIG_FILE}" << 'PYEOF'
import json, sys
path = sys.argv[1]
with open(path) as f:
    cfg = json.load(f)
cfg.setdefault("channels", {})["whatsapp"] = {
    "enabled": True,
    "dmPolicy": "open",
    "allowFrom": ["*"]
}
with open(path, "w") as f:
    json.dump(cfg, f, indent=2)
PYEOF
  echo "WhatsApp channel configured."
fi

# ── MCP servers ───────────────────────────────────────────────────────────────
if [ -n "${MCP_CONFIG_B64}" ]; then
  echo "Adding MCP server config..."
  python3 - "${CONFIG_FILE}" "${MCP_CONFIG_B64}" << 'PYEOF'
import json, sys, base64
path = sys.argv[1]
mcp_b64 = sys.argv[2]
mcp_servers = json.loads(base64.b64decode(mcp_b64).decode())
with open(path) as f:
    cfg = json.load(f)
cfg.setdefault("mcp", {})["servers"] = mcp_servers
with open(path, "w") as f:
    json.dump(cfg, f, indent=2)
PYEOF
  echo "MCP servers configured."
fi

echo "Config written | Agent: ${AGENT_ID} | Type: ${AGENT_TYPE} | Home: ${OPENCLAW_HOME}"

# Verify config is readable
echo "Config check: $(cat ${CONFIG_FILE} | head -c 50)..."
ls -la "${CONFIG_FILE}"

# ── Connectivity diagnostics ──────────────────────────────────────────────────
echo "=== CONNECTIVITY TEST ==="
echo "GEMINI_API_KEY set: ${GEMINI_API_KEY:+YES}"
echo "GATEWAY_TOKEN set: ${GATEWAY_TOKEN:+YES}"
echo "AGENT_MODEL: ${AGENT_MODEL}"

# Test DNS resolution
echo "DNS test (google):"
nslookup generativelanguage.googleapis.com 2>&1 | head -5 || echo "nslookup not found, trying getent"
getent hosts generativelanguage.googleapis.com 2>&1 | head -2 || echo "getent failed"

# Test outbound HTTPS
echo "Outbound HTTPS test (google):"
curl -sS -m 5 -o /dev/null -w "HTTP %{http_code} in %{time_total}s\n" https://generativelanguage.googleapis.com/ 2>&1 || echo "CURL FAILED - no internet access"

echo "Outbound HTTPS test (anthropic):"
curl -sS -m 5 -o /dev/null -w "HTTP %{http_code} in %{time_total}s\n" https://api.anthropic.com/ 2>&1 || echo "CURL FAILED - no internet access"

echo "=== END CONNECTIVITY TEST ==="

export OPENCLAW_CONFIG_PATH="${CONFIG_FILE}"

# ── Auth profiles ─────────────────────────────────────────────────────────────
# OpenClaw reads API keys from auth-profiles.json, not from openclaw.json
AUTH_DIR="${OPENCLAW_HOME}/.openclaw/agents/main/agent"
mkdir -p "${AUTH_DIR}"
python3 - "${AUTH_DIR}/auth-profiles.json" << PYEOF
import json, sys, os
path = sys.argv[1]
profiles = {}
if os.environ.get("ANTHROPIC_API_KEY"):
    profiles["anthropic:default"] = {"type": "api_key", "provider": "anthropic", "key": os.environ["ANTHROPIC_API_KEY"]}
if os.environ.get("GEMINI_API_KEY"):
    profiles["google:default"] = {"type": "api_key", "provider": "google", "key": os.environ["GEMINI_API_KEY"]}
if os.environ.get("OPENROUTER_API_KEY"):
    profiles["openrouter:default"] = {"type": "api_key", "provider": "openrouter", "key": os.environ["OPENROUTER_API_KEY"]}
data = {"version": 1, "profiles": profiles}
with open(path, "w") as f:
    json.dump(data, f, indent=2)
print(f"Auth profiles written: {list(profiles.keys())}")
PYEOF

exec openclaw gateway --bind lan --port 18789 --allow-unconfigured