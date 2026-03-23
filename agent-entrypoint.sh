#!/bin/bash
set -e

if [ -z "${GATEWAY_TOKEN}" ]; then
  echo "ERROR: GATEWAY_TOKEN is required" >&2
  exit 1
fi
if [ -z "${GEMINI_API_KEY}" ]; then
  echo "ERROR: GEMINI_API_KEY is required" >&2
  exit 1
fi

OPENCLAW_HOME="/home/node/.openclaw"
CONFIG_FILE="${OPENCLAW_HOME}/openclaw.json"
WORKSPACE="${OPENCLAW_HOME}/workspace"

export OPENCLAW_CONFIG_PATH="${CONFIG_FILE}"
export OPENCLAW_STATE_DIR="${OPENCLAW_HOME}"
export OPENCLAW_GATEWAY_TOKEN="${GATEWAY_TOKEN}"

echo "Starting OpenClaw agent: ${AGENT_ID} (${AGENT_TYPE})"

mkdir -p "${OPENCLAW_HOME}"
mkdir -p "${WORKSPACE}"
mkdir -p "${WORKSPACE}/memory"

SYSTEM_PROMPT="${SYSTEM_PROMPT:-You are a helpful AI assistant.}"
AGENT_MODEL="google/gemini-2.5-flash"

MODEL_ID=$(echo "${AGENT_MODEL}" | cut -d'/' -f2)
MODEL_NAME=$(echo "${MODEL_ID}" | sed 's/-/ /g' | sed 's/\b\(.\)/\u\1/g')

# Write system prompt to SYSTEM.md (what worked before)
cat > "${WORKSPACE}/SYSTEM.md" << EOSYSTEM
${SYSTEM_PROMPT}
EOSYSTEM

# Write role-specific files
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
    ;;
esac

if [ ! -f "${WORKSPACE}/MEMORY.md" ]; then
  cat > "${WORKSPACE}/MEMORY.md" << 'EOF'
# Long-term Memory
This file contains important facts about this user that should persist across all sessions.
EOF
fi

OC_VERSION=$(openclaw --version 2>/dev/null | grep -oP '[\d.]+' | head -1 || echo "2026.3.13")
OC_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

cat > "${CONFIG_FILE}" << EOJSON
{
  "models": {
    "providers": {
      "google": {
        "apiKey": "${GEMINI_API_KEY}",
        "baseUrl": "https://generativelanguage.googleapis.com/v1beta",
        "models": [
          {
            "id": "${MODEL_ID}",
            "name": "${MODEL_NAME}",
            "reasoning": false,
            "input": ["text"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 1000000,
            "maxTokens": 8192
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": { "primary": "${AGENT_MODEL}" },
      "workspace": "${WORKSPACE}",
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
      "allowedOrigins": [
        "http://localhost:18789",
        "http://127.0.0.1:18789"
      ]
    },
    "auth": {
      "token": "${GATEWAY_TOKEN}"
    },
    "http": {
      "endpoints": {
        "responses": { "enabled": true }
      }
    }
  },
  "meta": {
    "lastTouchedVersion": "${OC_VERSION}",
    "lastTouchedAt": "${OC_TIMESTAMP}"
  }
}
EOJSON

echo "Config written: ${CONFIG_FILE}"
echo "Workspace: ${WORKSPACE} | Role: ${AGENT_TYPE} | Model: ${AGENT_MODEL}"

exec openclaw gateway --bind lan --port 18789