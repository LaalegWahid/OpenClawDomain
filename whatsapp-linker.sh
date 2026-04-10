#!/bin/bash
# WhatsApp linking entrypoint — runs inside the ECS agent container
# Env vars required: AGENT_ID, OPENCLAW_HOME, WEBHOOK_BASE_URL, GATEWAY_TOKEN
#
# Uses Baileys directly (whatsapp-linker.mjs) instead of `openclaw channels login`
# because the OpenClaw CLI renders the QR as Unicode art and never emits the raw
# QR string to stdout — making it impossible to capture for our callback flow.
#
# Credentials are stored at:
#   ${OPENCLAW_HOME}/credentials/whatsapp/default/
# which is the path OpenClaw's @openclaw/whatsapp plugin reads on agent restart.

set -Eeuo pipefail

export HOME="${HOME:-/home/node}"
OPENCLAW_HOME="${OPENCLAW_HOME:-/home/node/.openclaw}"

echo "WhatsApp linker starting for agent: ${AGENT_ID}"

# Ensure openclaw home directory exists (EFS mount point)
mkdir -p "${OPENCLAW_HOME}"

echo "Starting WhatsApp login flow..."

exec node /home/node/whatsapp-linker.mjs \
  "${AGENT_ID}" \
  "${WEBHOOK_BASE_URL}" \
  "${GATEWAY_TOKEN}" \
  "${OPENCLAW_HOME}"
