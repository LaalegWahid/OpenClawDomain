/**
 * whatsapp-linker.mjs
 *
 * OpenClaw-native WhatsApp linker.
 * Runs as a short-lived ECS task (OPENCLAW_MODE=whatsapp_link).
 *
 * Architecture:
 *   1. Writes a minimal openclaw.json config (WhatsApp only) to a temp path
 *   2. Spawns `openclaw gateway` as a child process using that config
 *   3. Polls the gateway's /api/channels/* endpoint until a QR is available
 *   4. Sends { status: "qr_ready", qrData } to the Next.js callback
 *   5. Polls until connected, then sends { status: "linked" }
 *   6. Kills the gateway and exits
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
  console.error(
    'Usage: node whatsapp-linker.mjs <agentId> <baseUrl> <token> <openclawHome>'
  );
  process.exit(1);
}

const GATEWAY_PORT = 18789;
const GATEWAY_TOKEN = token; // reuse the app token for the ephemeral gateway
const authDir = join(openclawHome, 'credentials', 'whatsapp', 'default');

// Candidate API paths to probe (undocumented surface — try common patterns)
const API_PROBE_PATHS = [
  `/api/channels/whatsapp/default`,
  `/api/channels/whatsapp`,
  `/v1/channels/whatsapp/default`,
  `/v1/channels/whatsapp`,
  `/api/channel/whatsapp/default`,
];

// ── Callback helper ───────────────────────────────────────────────────────────
async function sendCallback(payload) {
  const callbackUrl =
    `${baseUrl.replace(/\/$/, '')}/api/agents/${agentId}/whatsapp/callback`;
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

    req.on('error', (err) => {
      console.error(`Callback request failed: ${err.message}`);
      resolve();
    });

    req.setTimeout(15_000, () => {
      console.error('Callback timed out');
      req.destroy();
      resolve();
    });

    req.write(data);
    req.end();
  });
}

async function fatal(err) {
  console.error(`Fatal error: ${err?.message ?? err}`);
  try { await sendCallback({ status: 'failed', error: String(err?.message ?? err) }); }
  catch { /* ignore */ }
  process.exit(1);
}

// ── HTTP GET helper ───────────────────────────────────────────────────────────
function httpGet(url, bearerToken) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const requester = parsed.protocol === 'https:' ? httpsRequest : httpRequest;
    const req = requester(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + (parsed.search || ''),
        method: 'GET',
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          Accept: 'application/json',
        },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => { body += c; });
        res.on('end', () => resolve({ status: res.statusCode, body }));
      }
    );
    req.setTimeout(10_000, () => { req.destroy(); reject(new Error('GET timed out')); });
    req.on('error', reject);
    req.end();
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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
          default: {
            authDir,
          },
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
  const gw = spawn('openclaw', ['gateway', '--bind', 'loopback', '--port', String(GATEWAY_PORT), '--allow-unconfigured'], {
    env: { ...process.env, OPENCLAW_CONFIG_PATH: configPath },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  gw.stdout.on('data', (d) => process.stdout.write(`[gateway] ${d}`));
  gw.stderr.on('data', (d) => process.stderr.write(`[gateway] ${d}`));
  gw.on('exit', (code, sig) => {
    if (!linked) {
      console.error(`Gateway exited unexpectedly (code=${code}, signal=${sig})`);
    }
  });

  return gw;
}

// ── Probe for the QR API endpoint ─────────────────────────────────────────────
async function discoverQrEndpoint() {
  const base = `http://localhost:${GATEWAY_PORT}`;
  for (const path of API_PROBE_PATHS) {
    const url = base + path;
    try {
      console.log(`Probing: GET ${url}`);
      const { status, body } = await httpGet(url, GATEWAY_TOKEN);
      console.log(`  → HTTP ${status}: ${body.slice(0, 200)}`);
      if (status === 200) {
        return { url, body };
      }
    } catch (err) {
      console.log(`  → Error: ${err.message}`);
    }
  }
  return null;
}

// ── Extract QR and connection state from API response body ────────────────────
function parseChannelResponse(body) {
  try {
    const json = JSON.parse(body);
    // Try common field names used by OpenClaw-style APIs
    const qr =
      json.qr ?? json.qrCode ?? json.qr_code ??
      json.data?.qr ?? json.data?.qrCode ?? json.data?.qr_code ?? null;
    const status =
      json.status ?? json.state ?? json.connectionState ??
      json.data?.status ?? json.data?.state ?? null;
    return { qr, status };
  } catch {
    return { qr: null, status: null };
  }
}

// ── State ─────────────────────────────────────────────────────────────────────
let linked = false;

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  await mkdir(authDir, { recursive: true });
  console.log(`WhatsApp linker starting | agentId=${agentId}`);
  console.log(`Auth state directory: ${authDir}`);

  // Write config to a temp dir
  const tmpDir = await mkdtemp(join(tmpdir(), 'openclaw-linker-'));
  const configPath = join(tmpDir, 'openclaw.json');
  await writeGatewayConfig(configPath);

  // Spawn the gateway
  const gw = spawnGateway(configPath);

  // 5-minute global timeout
  const timeoutHandle = setTimeout(async () => {
    console.error('Linking timed out after 5 minutes');
    gw.kill();
    await sendCallback({ status: 'failed', error: 'Timed out waiting for QR scan' }).catch(() => {});
    process.exit(1);
  }, 5 * 60 * 1000);
  timeoutHandle.unref();

  // Wait for the gateway to be up — it typically takes ~38s to be ready
  console.log('Waiting for gateway to start...');
  await sleep(10_000);

  // Discover the working QR endpoint
  let qrUrl = null;
  for (let attempt = 0; attempt < 20 && !qrUrl; attempt++) {
    if (attempt > 0) {
      console.log(`Gateway not ready yet, retrying probe in 3s (attempt ${attempt + 1}/20)...`);
      await sleep(3_000);
    }
    const result = await discoverQrEndpoint();
    if (result) {
      qrUrl = result.url;
      console.log(`QR endpoint discovered: ${qrUrl}`);
    }
  }

  if (!qrUrl) {
    gw.kill();
    await fatal(new Error(
      `Gateway did not become ready after 67s. Probed paths: ${API_PROBE_PATHS.join(', ')}`
    ));
    return;
  }

  // Poll until QR available, then until connected
  let lastQr = null;
  let qrSent = false;

  while (!linked) {
    await sleep(2_000);

    let body;
    try {
      const res = await httpGet(qrUrl, GATEWAY_TOKEN);
      body = res.body;
      if (res.status !== 200) {
        console.log(`Polling ${qrUrl} → HTTP ${res.status}`);
        continue;
      }
    } catch (err) {
      console.log(`Poll error: ${err.message}`);
      continue;
    }

    const { qr, status } = parseChannelResponse(body);

    if (status === 'connected' || status === 'open') {
      linked = true;
      clearTimeout(timeoutHandle);
      console.log('WhatsApp linked successfully!');
      gw.kill();
      await sendCallback({ status: 'linked' });
      process.exit(0);
    }

    if (qr && qr !== lastQr) {
      lastQr = qr;
      qrSent = true;
      console.log('QR code received — sending to callback...');
      await sendCallback({ status: 'qr_ready', qrData: qr });
    }

    if (!qrSent) {
      console.log(`Waiting for QR... (gateway status: ${status ?? 'unknown'})`);
    }
  }
}

main().catch(fatal);
