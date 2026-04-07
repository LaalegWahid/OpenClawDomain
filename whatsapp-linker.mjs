/**
 * whatsapp-linker.mjs
 *
 * Standalone Baileys-based WhatsApp linker.
 * Runs as a short-lived ECS task (OPENCLAW_MODE=whatsapp_link).
 *
 * Why direct Baileys instead of `openclaw channels login`:
 *   The OpenClaw CLI passes the raw QR string to qrcode-terminal which renders
 *   it as Unicode block art — the raw string is NEVER written to stdout.
 *   Using Baileys directly gives us the qr string from the connection.update event.
 *
 * Credentials are written to:
 *   ${OPENCLAW_HOME}/credentials/whatsapp/default/
 * which is exactly where OpenClaw's @openclaw/whatsapp plugin expects them.
 *
 * Usage:
 *   node whatsapp-linker.mjs <agentId> <baseUrl> <token> <openclawHome>
 */

import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion }
  from '@whiskeysockets/baileys';
import { mkdir } from 'fs/promises';
import { join } from 'path';
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

// Credentials stored here — matches OpenClaw's @openclaw/whatsapp plugin path
const authDir = join(openclawHome, 'credentials', 'whatsapp', 'default');

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

// ── Silent logger (suppress Baileys internal noise) ───────────────────────────
const noop = () => {};
const logger = {
  level: 'silent',
  info: noop, warn: noop, error: noop,
  debug: noop, trace: noop, fatal: noop,
  child() { return this; },
};

// ── State ─────────────────────────────────────────────────────────────────────
let lastQr = null;
let linked = false;
let timeoutHandle;
let reconnectCount = 0;
const MAX_RECONNECTS = 5;

async function onFatal(err) {
  console.error(`Fatal error: ${err?.message ?? err}`);
  try { await sendCallback({ status: 'failed', error: String(err?.message ?? err) }); }
  catch { /* ignore */ }
  process.exit(1);
}

// ── Connection ────────────────────────────────────────────────────────────────
async function startConnection(version) {
  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,   // We handle QR ourselves via the event
    logger,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    // ── New QR code ──────────────────────────────────────────────────────────
    if (qr && qr !== lastQr) {
      lastQr = qr;
      console.log('QR code received — sending to callback...');
      await sendCallback({ status: 'qr_ready', qrData: qr });
    }

    // ── Linked ───────────────────────────────────────────────────────────────
    if (connection === 'open' && !linked) {
      linked = true;
      clearTimeout(timeoutHandle);
      console.log('WhatsApp linked successfully!');
      await sendCallback({ status: 'linked' });
      process.exit(0);
    }

    // ── Closed ───────────────────────────────────────────────────────────────
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      console.log(`Connection closed (statusCode=${statusCode})`);

      // Permanent failures — do not reconnect
      if (
        statusCode === DisconnectReason.loggedOut ||
        statusCode === DisconnectReason.connectionReplaced ||
        statusCode === DisconnectReason.badSession
      ) {
        await sendCallback({
          status: 'failed',
          error: `WhatsApp disconnected: ${statusCode}`,
        });
        process.exit(1);
      }

      // Transient disconnect during linking (connection reset, timeout, etc.)
      // Reconnect so Baileys generates a fresh QR for the user to scan.
      reconnectCount++;
      if (reconnectCount > MAX_RECONNECTS) {
        await sendCallback({ status: 'failed', error: `Too many reconnects (last statusCode=${statusCode})` });
        process.exit(1);
      }
      console.log(`Transient disconnect - reconnecting for fresh QR (attempt ${reconnectCount})...`);
      startConnection(version).catch(onFatal);
    }
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  await mkdir(authDir, { recursive: true });
  console.log(`WhatsApp linker starting | agentId=${agentId}`);
  console.log(`Auth state directory: ${authDir}`);

  const { version } = await fetchLatestBaileysVersion();
  console.log(`Baileys WA version: ${version.join('.')}`);

  // 5-minute global timeout — enough for multiple QR refreshes
  timeoutHandle = setTimeout(async () => {
    console.error('Linking timed out after 5 minutes');
    await sendCallback({
      status: 'failed',
      error: 'Timed out waiting for QR scan',
    }).catch(() => {});
    process.exit(1);
  }, 5 * 60 * 1000);

  // Allow the process to exit even if the timer is still active
  timeoutHandle.unref();

  await startConnection(version);
}

main().catch(onFatal);
