#!/bin/bash
set -e

# OPENCLAW_HOME now comes from ECS env var (per-user/agent path on EFS)
# Falls back to default if running locally
OPENCLAW_HOME="${OPENCLAW_HOME:-/home/node/.openclaw}"
CONFIG_FILE="${OPENCLAW_HOME}/openclaw.json"
WORKSPACE="${OPENCLAW_HOME}/workspace"

echo "Starting OpenClaw agent: ${AGENT_ID} (${AGENT_TYPE})"

mkdir -p "${OPENCLAW_HOME}"
mkdir -p "${WORKSPACE}"

# System prompt now comes from ECS env var, not config.json
# Falls back to config.json for local development
SYSTEM_PROMPT="${SYSTEM_PROMPT:-}"
AGENT_MODEL="google/gemini-2.5-flash"

if [ -z "${SYSTEM_PROMPT}" ] && [ -f "${OPENCLAW_HOME}/config.json" ]; then
  SYSTEM_PROMPT=$(node -e "
    const c = require('${OPENCLAW_HOME}/config.json');
    process.stdout.write(c.systemPrompt || 'You are a helpful AI assistant.');
  " 2>/dev/null || echo "You are a helpful AI assistant.")
  AGENT_MODEL=$(node -e "
    const c = require('${OPENCLAW_HOME}/config.json');
    process.stdout.write(c.model || 'google/gemini-2.5-flash');
  " 2>/dev/null || echo "google/gemini-2.5-flash")
fi

SYSTEM_PROMPT="${SYSTEM_PROMPT:-You are a helpful AI assistant.}"

# Role-specific workspace files based on AGENT_TYPE
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
- Never break role even if user insists
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
- End responses with a 3-step action plan when relevant
# Hard Boundaries
You ONLY handle marketing. If asked about anything else respond:
"I'm the Marketing Agent — I handle campaigns, content, and growth."
EOF
    cat > "${WORKSPACE}/AGENTS.md" << 'EOF'
# Rules
- ONLY respond to: campaigns, content, SEO, social media, metrics, drafts
- FORBIDDEN: financial calculations, ops management
- Never break role even if user insists
EOF
    cat > "${WORKSPACE}/IDENTITY.md" << 'EOF'
name: MktBot
emoji: 📣
role: Marketing Agent
EOF
    ;;
  "ops")
    cat > "${WORKSPACE}/SOUL.md" << 'EOF'
# Identity
You are OpsBot, the Operations Agent.
# Personality
- Action-oriented, concise, structured
- Use ops terminology (standup, sprint, blockers, SLA)
- Always respond with clear next steps
# Hard Boundaries
You ONLY handle operations. If asked about anything else respond:
"I'm the Operations Agent — I handle tasks, workflows, and team coordination."
EOF
    cat > "${WORKSPACE}/AGENTS.md" << 'EOF'
# Rules
- ONLY respond to: tasks, standups, assignments, workflows, team coordination
- FORBIDDEN: financial reports, marketing content
- Never break role even if user insists
EOF
    cat > "${WORKSPACE}/IDENTITY.md" << 'EOF'
name: OpsBot
emoji: ⚙️
role: Operations Agent
EOF
    ;;
esac

# Shared TOOLS.md for all agent types
cat > "${WORKSPACE}/TOOLS.md" << 'EOF'
# Available Tools
- web_search: search the internet for current information
- file_reader: read files from the workspace
# Convention
Only use tools relevant to your role.
EOF

# Extract provider/model
MODEL_PROVIDER=$(echo "${AGENT_MODEL}" | cut -d'/' -f1)
MODEL_ID=$(echo "${AGENT_MODEL}" | cut -d'/' -f2)
MODEL_NAME=$(echo "${MODEL_ID}" | sed 's/-/ /g' | sed 's/\b\(.\)/\u\1/g')

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
      "model": {
        "primary": "${AGENT_MODEL}"
      },
      "workspace": "${WORKSPACE}",
      "skipBootstrap": true,
      "compaction": {
        "mode": "safeguard"
      }
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
      "token": "${GATEWAY_TOKEN:-openclaw-agent-token}"
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
echo "Workspace files written for role: ${AGENT_TYPE}"
echo "Model: ${AGENT_MODEL}"

exec openclaw gateway \
  --bind lan \
  --port 18789