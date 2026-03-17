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
      "amazon-bedrock": {
        "baseUrl": "https://bedrock-runtime.${AWS_REGION:-us-east-1}.amazonaws.com",
        "api": "bedrock-converse-stream",
        "auth": "aws-sdk",
        "models": [
          {
            "id": "us.amazon.nova-lite-v1:0",
            "name": "Amazon Nova Lite",
            "reasoning": false,
            "input": ["text"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 128000,
            "maxTokens": 4096
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "amazon-bedrock/us.amazon.nova-lite-v1:0"
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
