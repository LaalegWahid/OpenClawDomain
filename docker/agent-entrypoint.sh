#!/bin/bash
set -e

OPENCLAW_HOME="/home/node/.openclaw"
CONFIG_FILE="${OPENCLAW_HOME}/openclaw.json"
WORKSPACE="${OPENCLAW_HOME}/workspace"

echo "Starting OpenClaw agent: ${AGENT_ID}"

# Create directories
mkdir -p "${OPENCLAW_HOME}"
mkdir -p "${WORKSPACE}"

# Read system prompt and model from mounted config if available
SYSTEM_PROMPT="You are a helpful AI assistant."
AGENT_MODEL="google/gemini-2.5-flash"
if [ -f "${OPENCLAW_HOME}/config.json" ]; then
  SYSTEM_PROMPT=$(node -e "
    const c = require('${OPENCLAW_HOME}/config.json');
    process.stdout.write(c.systemPrompt || 'You are a helpful AI assistant.');
  " 2>/dev/null || echo "You are a helpful AI assistant.")
  AGENT_MODEL=$(node -e "
    const c = require('${OPENCLAW_HOME}/config.json');
    process.stdout.write(c.model || 'google/gemini-2.5-flash');
  " 2>/dev/null || echo "google/gemini-2.5-flash")
fi

# Extract provider and model id from "provider/model" format
MODEL_PROVIDER=$(echo "${AGENT_MODEL}" | cut -d'/' -f1)
MODEL_ID=$(echo "${AGENT_MODEL}" | cut -d'/' -f2)
MODEL_NAME=$(echo "${MODEL_ID}" | sed 's/-/ /g' | sed 's/\b\(.\)/\u\1/g')

# Write system prompt to workspace SYSTEM.md (injected into agent context)
cat > "${WORKSPACE}/SYSTEM.md" << EOSYSTEM
${SYSTEM_PROMPT}
EOSYSTEM

# Get the OpenClaw version for meta field
OC_VERSION=$(openclaw --version 2>/dev/null | grep -oP '[\d.]+' | head -1 || echo "2026.3.13")
OC_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

# Write openclaw.json with meta field so OpenClaw won't overwrite it
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

echo "Config written to ${CONFIG_FILE}"
echo "System prompt written to ${WORKSPACE}/SYSTEM.md"
echo "Model: ${AGENT_MODEL}"

# Start the OpenClaw gateway
exec openclaw gateway \
  --bind lan \
  --port 18789
