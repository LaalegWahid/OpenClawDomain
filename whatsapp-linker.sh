#!/bin/bash
# WhatsApp linking entrypoint — runs inside the ECS agent container
# Env vars required: AGENT_ID, OPENCLAW_HOME, WEBHOOK_BASE_URL, GATEWAY_TOKEN

set -e

export HOME="${HOME:-/home/node}"
OPENCLAW_HOME="${OPENCLAW_HOME:-/home/node/.openclaw}"

echo "WhatsApp linker starting for agent: ${AGENT_ID}"

# Ensure openclaw home directory exists (EFS mount)
mkdir -p "${OPENCLAW_HOME}"

# Install WhatsApp channel plugin (idempotent)
openclaw channels add --channel whatsapp 2>&1 || true

echo "Starting WhatsApp login flow..."

# Python script to run openclaw login, parse QR, and call back to our API
python3 - "${AGENT_ID}" "${WEBHOOK_BASE_URL}" "${GATEWAY_TOKEN}" << 'PYEOF'
import subprocess
import sys
import os
import json
import re
import time
import urllib.request
import urllib.error

agent_id  = sys.argv[1]
base_url  = sys.argv[2].rstrip("/")
token     = sys.argv[3]

def send_callback(payload):
    url = f"{base_url}/api/agents/{agent_id}/whatsapp/callback"
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            print(f"Callback ok: {resp.status}", flush=True)
    except urllib.error.HTTPError as e:
        print(f"Callback HTTP error {e.code}: {e.read().decode()}", file=sys.stderr, flush=True)
    except Exception as e:
        print(f"Callback failed: {e}", file=sys.stderr, flush=True)

# Run the login command and pipe its combined stdout+stderr
proc = subprocess.Popen(
    ["openclaw", "channels", "login", "--channel", "whatsapp"],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    bufsize=1,
)

last_qr = None

for line in proc.stdout:
    line = line.rstrip()
    print(line, flush=True)

    # ── QR data patterns ──────────────────────────────────────────────────────
    # Baileys usually outputs the raw QR string on its own line.
    # Pattern 1: WhatsApp Web ref format  "1@xxx,yyy,zzz" or "2@xxx,yyy,zzz"
    m = re.search(r"(\d@[A-Za-z0-9+/=,_\-]{20,})", line)
    if m:
        qr_data = m.group(1)
        if qr_data != last_qr:
            last_qr = qr_data
            send_callback({"status": "qr_ready", "qrData": qr_data})
        continue

    # Pattern 2: explicit "QR: <data>" or "qrcode: <data>"
    m = re.search(r"(?i)qr(?:code)?\s*[:\-]\s*(\S{20,})", line)
    if m:
        qr_data = m.group(1).strip()
        if qr_data != last_qr:
            last_qr = qr_data
            send_callback({"status": "qr_ready", "qrData": qr_data})
        continue

    # ── Success indicators ────────────────────────────────────────────────────
    if re.search(r"(?i)(linked|connected|authenticated|pairing complete|welcome back)", line):
        send_callback({"status": "linked"})
        print("WhatsApp linked successfully!", flush=True)
        proc.terminate()
        sys.exit(0)

    # ── Failure indicators ────────────────────────────────────────────────────
    if re.search(r"(?i)(timed out|connection closed|fatal|unable to connect)", line):
        send_callback({"status": "failed", "error": line})
        print(f"Linker failed: {line}", file=sys.stderr, flush=True)
        proc.terminate()
        sys.exit(1)

exit_code = proc.wait()
if exit_code != 0:
    send_callback({"status": "failed", "error": f"Process exited with code {exit_code}"})
PYEOF
