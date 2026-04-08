/**
 * whatsapp-linker.mjs
 *
 * OpenClaw-native WhatsApp linker.
 * Runs as a short-lived ECS task (OPENCLAW_MODE=whatsapp_link).
 *
 * Architecture:
 *   1. Writes a minimal openclaw.json config (WhatsApp only) to a temp path
 *   2. Spawns `openclaw gateway` as a child process using that config
 *   3. Waits for the gateway HTTP to be reachable (GET /v1/models)
 *   4. Connects to the gateway via WebSocket (ws://localhost:<port>)
 *   5. Sends web.login.start → OpenClaw initiates QR flow
 *   6. Receives QR from WebSocket response/event, forwards to Next.js callback
 *   7. Sends web.login.wait → blocks until QR is scanned
 *   8. Sends { status: "linked" } on success, kills gateway, exits
 *
 * This approach lets OpenClaw own the entire credential lifecycle — it writes
 * credentials in its own format, so the agent reads them back without mismatch.
 *
 * Usage:
 *   node whatsapp-linker.mjs <agentId> <baseUrl> <token> <openclawHome>
 */

import { mkdir, writeFile, mkdtemp } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawn } from 'child_process';
import { request as httpsRequest } from 'https';
import { request as httpRequest } from 'http';
import { URL } from 'url';

// ── Args ──────────────────────────────────────────────────────────────────────
const [,, agentId, baseUrl, token, openclawHome] = process.argv;

if (!agentId || !baseUrl || !token || !openclawHome) {
  console.error('Usage: node whatsapp-linker.mjs <agentId> <baseUrl> <token> <openclawHome>');
  process.exit(1);
}

const GATEWAY_PORT = 18789;
const GATEWAY_TOKEN = token;
const authDir = join(openclawHome, 'credentials', 'whatsapp', 'default');

// ── Callback helper ───────────────────────────────────────────────────────────
async function sendCallback(payload) {
  const callbackUrl = `${baseUrl.replace(/\/$/, '')}/api/agents/${agentId}/whatsapp/callback`;
  const data = JSON.stringify(payload);
  const parsed = new URL(callbackUrl);
  const requester = parsed.protocol === 'https:' ? httpsRequest : httpRequest;

  await new Promise((resolve) => {
    const req = requester(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + (parsed.search || ''),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => { body += c; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`Callback ok: ${res.statusCode}`);
          } else {
            console.error(`Callback HTTP error ${res.statusCode}: ${body}`);
          }
          resolve();
        });
      }
    );
    req.on('error', (err) => { console.error(`Callback request failed: ${err.message}`); resolve(); });
    req.setTimeout(15_000, () => { console.error('Callback timed out'); req.destroy(); resolve(); });
    req.write(data);
    req.end();
  });
}

async function fatal(err) {
  console.error(`Fatal error: ${err?.message ?? err}`);
  try { await sendCallback({ status: 'failed', error: String(err?.message ?? err) }); } catch { /* ignore */ }
  process.exit(1);
}

// ── Write minimal openclaw config ─────────────────────────────────────────────
async function writeGatewayConfig(configPath) {
  const config = {
    gateway: {
      mode: 'local',
      bind: 'loopback',
      port: GATEWAY_PORT,
      auth: { token: GATEWAY_TOKEN },
    },
    channels: {
      whatsapp: {
        enabled: true,
        dmPolicy: 'open',
        allowFrom: ['*'],
        accounts: {
          default: { authDir },
        },
      },
    },
  };
  await writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
  console.log(`Gateway config written to: ${configPath}`);
}

// ── Spawn openclaw gateway ────────────────────────────────────────────────────
function spawnGateway(configPath) {
  console.log(`Spawning openclaw gateway on port ${GATEWAY_PORT}...`);
  const gw = spawn(
    'openclaw',
    ['gateway', '--bind', 'loopback', '--port', String(GATEWAY_PORT), '--allow-unconfigured'],
    { env: { ...process.env, OPENCLAW_CONFIG_PATH: configPath }, stdio: ['ignore', 'pipe', 'pipe'] }
  );
  gw.stdout.on('data', (d) => process.stdout.write(`[gateway] ${d}`));
  gw.stderr.on('data', (d) => process.stderr.write(`[gateway] ${d}`));
  gw.on('exit', (code, sig) => {
    if (!linked) console.error(`Gateway exited unexpectedly (code=${code}, signal=${sig})`);
  });
  return gw;
}

// ── Wait for gateway HTTP to be reachable ─────────────────────────────────────
// Probes GET /v1/models (a known endpoint) until it responds with any non-5xx.
function waitForGatewayHttp(timeoutMs = 120_000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;

    function probe() {
      const req = httpRequest(
        {
          hostname: 'localhost',
          port: GATEWAY_PORT,
          path: '/v1/models',
          method: 'GET',
          headers: { Authorization: `Bearer ${GATEWAY_TOKEN}` },
        },
        (res) => {
          res.resume();
          if (res.statusCode < 500) {
            console.log(`Gateway HTTP ready (status ${res.statusCode})`);
            resolve();
          } else {
            retry();
          }
        }
      );
      req.on('error', retry);
      req.setTimeout(3_000, () => { req.destroy(); retry(); });
      req.end();
    }

    function retry() {
      if (Date.now() > deadline) {
        reject(new Error('Gateway HTTP did not become ready within timeout'));
        return;
      }
      setTimeout(probe, 2_000);
    }

    probe();
  });
}

// ── Extract QR / connection status from any WebSocket message ─────────────────
// OpenClaw's WebSocket payload schema is undocumented — try every likely path.
function extractFromMsg(msg) {
  const qr =
    msg?.result?.qr          ?? msg?.result?.qrCode        ?? msg?.result?.qr_code    ??
    msg?.result?.data?.qr    ?? msg?.result?.data?.qrCode   ??
    msg?.payload?.qr         ?? msg?.payload?.qrCode        ?? msg?.payload?.qr_code   ??
    msg?.payload?.data?.qr   ?? msg?.payload?.data?.qrCode  ??
    msg?.data?.qr            ?? msg?.data?.qrCode           ??
    null;

  const status =
    msg?.result?.status           ?? msg?.result?.state            ?? msg?.result?.connectionState ??
    msg?.result?.connected        ??
    msg?.payload?.status          ?? msg?.payload?.state           ?? msg?.payload?.connectionState ??
    msg?.payload?.connected       ??
    msg?.data?.status             ?? msg?.data?.state              ??
    null;

  return { qr, status };
}

// ── State ─────────────────────────────────────────────────────────────────────
let linked = false;

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  await mkdir(authDir, { recursive: true });
  console.log(`WhatsApp linker starting | agentId=${agentId}`);

  const tmpDir = await mkdtemp(join(tmpdir(), 'openclaw-linker-'));
  const configPath = join(tmpDir, 'openclaw.json');
  await writeGatewayConfig(configPath);

  const gw = spawnGateway(configPath);

  // 5-minute global timeout
  const timeoutHandle = setTimeout(async () => {
    console.error('Linking timed out after 5 minutes');
    gw.kill();
    await sendCallback({ status: 'failed', error: 'Timed out waiting for QR scan' }).catch(() => {});
    process.exit(1);
  }, 5 * 60 * 1000);
  timeoutHandle.unref();

  // Wait for the gateway HTTP server to be ready before opening WebSocket
  console.log('Waiting for gateway to be ready...');
  await waitForGatewayHttp(120_000);

  // ── WebSocket login flow ───────────────────────────────────────────────────
  // Node.js 22+ has a built-in global WebSocket (WHATWG spec).
  // WHATWG WebSocket does not support custom request headers, so we pass the
  // bearer token via query param — a common pattern for gateway WebSockets.
  await new Promise((resolve, reject) => {
    const wsUrl = `ws://localhost:${GATEWAY_PORT}/?token=${GATEWAY_TOKEN}`;
    console.log(`Opening WebSocket: ${wsUrl}`);

    const ws = new WebSocket(wsUrl);
    let seq = 0;
    let lastQr = null;
    let loginWaitSent = false;

    function sendMsg(method, params = {}) {
      const msg = { type: 'req', method, params, seq: ++seq };
      console.log(`WS → ${JSON.stringify(msg)}`);
      ws.send(JSON.stringify(msg));
    }

    ws.addEventListener('open', () => {
      console.log('WebSocket connected — sending web.login.start');
      sendMsg('web.login.start', { channel: 'whatsapp', account: 'default' });
    });

    ws.addEventListener('message', async ({ data }) => {
      let msg;
      try {
        msg = JSON.parse(data);
      } catch {
        console.log(`WS raw (non-JSON): ${String(data).slice(0, 300)}`);
        return;
      }

      // Log everything — essential while the schema is undocumented
      console.log(`WS ← ${JSON.stringify(msg).slice(0, 800)}`);

      const { qr, status } = extractFromMsg(msg);

      if (qr && qr !== lastQr) {
        lastQr = qr;
        console.log('QR received via WebSocket — forwarding to callback...');
        await sendCallback({ status: 'qr_ready', qrData: qr });

        // Send web.login.wait once QR is in hand — this blocks until scanned
        if (!loginWaitSent) {
          loginWaitSent = true;
          sendMsg('web.login.wait', { channel: 'whatsapp', account: 'default' });
        }
      }

      if (status === 'connected' || status === 'open' || status === true) {
        linked = true;
        clearTimeout(timeoutHandle);
        console.log('WhatsApp linked successfully!');
        ws.close();
        gw.kill();
        await sendCallback({ status: 'linked' });
        resolve();
        process.exit(0);
      }
    });

    ws.addEventListener('error', (err) => {
      console.error(`WebSocket error: ${err.type ?? err.message ?? String(err)}`);
      reject(new Error(`WebSocket error: ${err.type ?? 'unknown'}`));
    });

    ws.addEventListener('close', ({ code, reason }) => {
      console.log(`WebSocket closed (code=${code}, reason=${reason})`);
      if (!linked) reject(new Error(`WebSocket closed before linking completed (code=${code})`));
    });
  });
}

main().catch(fatal);
