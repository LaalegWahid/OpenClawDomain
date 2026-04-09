#!/usr/bin/env node
/**
 * whatsapp-relay.mjs
 *
 * Standalone Baileys relay process. Runs inside the agent container alongside
 * OpenClaw gateway. Intercepts inbound WhatsApp messages, POSTs them to Next.js
 * for PDF generation / AI response, then sends the reply back via Baileys.
 *
 * OpenClaw is NOT given the WhatsApp channel (agent-config.py skips it when
 * WHATSAPP_INBOUND_WEBHOOK_URL is set), preventing a duplicate Baileys session.
 *
 * Credentials loaded from ${OPENCLAW_HOME}/credentials/whatsapp/default/ — same
 * path written by whatsapp-linker.mjs and expected by OpenClaw's whatsapp plugin.
 */
import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers }
  from '@whiskeysockets/baileys';

const webhookUrl   = process.env.WHATSAPP_INBOUND_WEBHOOK_URL;
const gatewayToken = process.env.GATEWAY_TOKEN;
const credsDir     = `${process.env.OPENCLAW_HOME}/credentials/whatsapp/default`;

if (!webhookUrl)   { console.error('whatsapp-relay: WHATSAPP_INBOUND_WEBHOOK_URL not set'); process.exit(1); }
if (!gatewayToken) { console.error('whatsapp-relay: GATEWAY_TOKEN not set'); process.exit(1); }
if (!process.env.OPENCLAW_HOME) { console.error('whatsapp-relay: OPENCLAW_HOME not set'); process.exit(1); }

// Suppress Baileys internal noise (same as linker)
const noop = () => {};
const logger = { level: 'silent', info: noop, warn: noop, error: noop, debug: noop, trace: noop, fatal: noop, child() { return this; } };

async function startRelay() {
  const { state, saveCreds } = await useMultiFileAuthState(credsDir);
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    browser: Browsers.ubuntu('Chrome'),
    auth: state,
    printQRInTerminal: false,
    logger,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        console.log('whatsapp-relay: disconnected — reconnecting in 5s');
        setTimeout(startRelay, 5000);
      } else {
        console.log('whatsapp-relay: logged out — not reconnecting');
      }
    } else if (connection === 'open') {
      console.log('whatsapp-relay: connected');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      const text = msg.message?.conversation
                || msg.message?.extendedTextMessage?.text || '';
      if (!text.trim()) continue;
      const jid = msg.key.remoteJid;

      console.log(`whatsapp-relay: inbound ${jid}: ${text.slice(0, 80)}`);

      try {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${gatewayToken}`,
          },
          body: JSON.stringify({ jid, text, pushName: msg.pushName ?? '' }),
          signal: AbortSignal.timeout(120_000),
        });
        const reply = await res.json();

        if (reply.type === 'text') {
          await sock.sendMessage(jid, { text: reply.text });
        } else if (reply.type === 'document') {
          await sock.sendMessage(jid, {
            document: Buffer.from(reply.document, 'base64'),
            mimetype: reply.mimetype ?? 'application/pdf',
            fileName: reply.filename ?? 'document.pdf',
            caption: reply.caption ?? '',
          });
        }
      } catch (err) {
        console.error('whatsapp-relay: error', err?.message);
      }
    }
  });
}

startRelay().catch(err => { console.error(err); process.exit(1); });
