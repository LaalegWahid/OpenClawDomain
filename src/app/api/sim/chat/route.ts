import { NextResponse } from "next/server";

// System prompt mirrors the SOUL.md / IDENTITY.md / AGENTS.md pattern that
// agent-entrypoint.sh writes for a custom-type agent. Rob is a generic
// demo agent — friendly, concise, OpenClaw-aware.
const ROB_SYSTEM_PROMPT = `# Identity
You are Rob, a Trading Agent built on OpenClaw, running inside a simulated dashboard environment.

# Personality
- Calm, precise, market-aware.
- Speak the language of trading: bid/ask, spread, liquidity, support/resistance, RR, drawdown, position sizing, R-multiples, volatility, regime.
- Default to risk-first thinking — entries, stops, and sizing before targets.
- You acknowledge that you are a simulation: every dashboard control around you is mocked, only the chat is live.

# Domain
You ONLY handle trading topics: market analysis, technical/fundamental setups, risk management, position sizing, journaling, strategy critique, broker/exchange mechanics, order types, crypto/FX/equities/futures concepts.

# Hard Boundaries
- You are not a licensed financial advisor. Frame answers as educational. No "buy this now" calls without setup, invalidation, and risk context.
- No live market data — you reason from what the user shares (price, levels, timeframe, account size).
- Don't pretend to place real orders, read real PnL, or execute real actions on the dashboard.
- If asked about anything non-trading respond: "I'm Rob, a Trading Agent — I only handle trading and markets."

# Channels
You answer in two places at once: the in-app chat UI and Telegram (@ClawMananger03_bot). Keep replies platform-agnostic and short enough to read comfortably on a phone.

# Style
- Plain prose, no markdown headings.
- Default to 1–4 sentences. Expand only when the user explicitly asks for detail or wants a full plan.
- When giving a trade idea, structure it as: bias → entry zone → invalidation → target(s) → risk note.`;

interface InboundMessage {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  messages?: InboundMessage[];
  message?: string;
  telegramChatId?: string;
}

const CLAUDE_MODEL = "claude-haiku-4-5-20251001";
const CLAUDE_URL = "https://api.anthropic.com/v1/messages";
const TELEGRAM_API_BASE = "https://api.telegram.org";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const messages = normalizeMessages(body);
  if (messages.length === 0) {
    return NextResponse.json({ error: "No message provided" }, { status: 400 });
  }

  const apiKey = process.env.anthropic_api_key || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Anthropic API key not configured (set anthropic_api_key in .env)" },
      { status: 500 },
    );
  }

  let reply: string;
  try {
    reply = await callClaude(apiKey, messages);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Claude request failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  // Best-effort Telegram delivery — never fail the request if it doesn't work.
  let telegramDelivered = false;
  let telegramError: string | undefined;
  const chatId = body.telegramChatId?.trim();
  if (chatId) {
    const tgToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!tgToken) {
      telegramError = "TELEGRAM_BOT_TOKEN not set in environment";
    } else {
      const result = await sendToTelegram(tgToken, chatId, reply);
      telegramDelivered = result.ok;
      telegramError = result.error;
    }
  }

  return NextResponse.json({
    reply,
    telegramDelivered,
    ...(telegramError ? { telegramError } : {}),
  });
}

function normalizeMessages(body: RequestBody): InboundMessage[] {
  if (Array.isArray(body.messages)) {
    return body.messages
      .filter((m): m is InboundMessage =>
        !!m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.length > 0,
      )
      .slice(-30);
  }
  if (typeof body.message === "string" && body.message.trim()) {
    return [{ role: "user", content: body.message.trim() }];
  }
  return [];
}

async function callClaude(apiKey: string, messages: InboundMessage[]): Promise<string> {
  const res = await fetch(CLAUDE_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: ROB_SYSTEM_PROMPT,
      messages,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Claude API ${res.status}: ${text.slice(0, 300)}`);
  }

  const data: {
    content?: { type: string; text?: string }[];
  } = await res.json();

  const reply = (data.content ?? [])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text!)
    .join("\n")
    .trim();

  if (!reply) throw new Error("Claude returned an empty response");
  return reply;
}

async function sendToTelegram(
  token: string,
  chatId: string,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { ok: false, error: `Telegram ${res.status}: ${errText.slice(0, 200)}` };
    }
    const data: { ok?: boolean; description?: string } = await res.json();
    if (!data.ok) {
      return { ok: false, error: data.description ?? "Telegram returned ok=false" };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Telegram fetch failed" };
  }
}
