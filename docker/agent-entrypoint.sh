#!/bin/bash
set -e

OPENCLAW_HOME="/home/node/.openclaw"
CONFIG_FILE="${OPENCLAW_HOME}/openclaw.json"
WORKSPACE="${OPENCLAW_HOME}/workspace"

echo "Starting OpenClaw agent: ${AGENT_TYPE} (${AGENT_ID})"

# Create directories
mkdir -p "${OPENCLAW_HOME}"
mkdir -p "${WORKSPACE}"

# Read system prompt from mounted config if available
SYSTEM_PROMPT="You are a helpful AI assistant."
if [ -f "${OPENCLAW_HOME}/config.json" ]; then
  SYSTEM_PROMPT=$(node -e "
    const c = require('${OPENCLAW_HOME}/config.json');
    process.stdout.write(c.systemPrompt || 'You are a helpful AI assistant.');
  " 2>/dev/null || echo "You are a helpful AI assistant.")
fi

# Write system prompt to workspace SYSTEM.md (injected into agent context)
cat > "${WORKSPACE}/SYSTEM.md" << EOSYSTEM
${SYSTEM_PROMPT}
EOSYSTEM

# Write openclaw.json with Bedrock provider config
cat > "${CONFIG_FILE}" << EOJSON
{
  "models": {
    "providers": {
      "google": {
        "apiKey": "${GEMINI_API_KEY}",
        "models": [
          {
            "id": "gemini-2.0-flash",
            "name": "Gemini 2.0 Flash",
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
        "primary": "google/gemini-2.0-flash"
      },
      "workspace": "${WORKSPACE}"
    }
  },
  "gateway": {
    "mode": "local",
    "bind": "lan",
    "port": 18789,
    "auth": {
      "token": "${GATEWAY_TOKEN:-openclaw-agent-token}"
    },
    "http": {
      "endpoints": {
        "responses": { "enabled": true }
      }
    }
  }
}
EOJSON

echo "Config written to ${CONFIG_FILE}"
echo "System prompt written to ${WORKSPACE}/SYSTEM.md"
echo "AWS Region: ${AWS_REGION:-us-east-1}"
echo "Agent Type: ${AGENT_TYPE}"

# Start the OpenClaw gateway
exec openclaw gateway \
  --bind lan \
  --port 18789
