import { NextResponse } from "next/server";

const CLAUDE_MODEL = "claude-haiku-4-5-20251001";
const CLAUDE_URL = "https://api.anthropic.com/v1/messages";
const TELEGRAM_API_BASE = "https://api.telegram.org";

// --- Fake Polymarket Data ---
const FAKE_POLYMARKET_DATA = [
  { market: "Will BTC close above $120K in April 2026?", yes: "68%", no: "32%", volume: "$9.2M" },
  { market: "Will ETH outperform BTC during April 2026?", yes: "46%", no: "54%", volume: "$4.8M" },
  { market: "Will the Fed hold interest rates steady in April 2026?", yes: "71%", no: "29%", volume: "$7.3M" },
  { market: "Will Nvidia hit a new all-time high in April 2026?", yes: "59%", no: "41%", volume: "$5.5M" },
  { market: "Will OpenAI announce GPT-5 Turbo in April 2026?", yes: "52%", no: "48%", volume: "$6.7M" },
  { market: "Will Apple unveil new AI features before May 2026?", yes: "64%", no: "36%", volume: "$3.9M" },
  { market: "Will the S&P 500 gain more than 5% in April 2026?", yes: "43%", no: "57%", volume: "$4.4M" },
  { market: "Will oil prices exceed $100/barrel in April 2026?", yes: "37%", no: "63%", volume: "$2.6M" },
  { market: "Will SpaceX launch Starship successfully in April 2026?", yes: "62%", no: "38%", volume: "$5.9M" },
  { market: "Will Tesla deliver over 500K vehicles in Q1 2026?", yes: "55%", no: "45%", volume: "$4.2M" },
  { market: "Will the US unemployment rate rise above 5% by April 2026?", yes: "31%", no: "69%", volume: "$3.1M" },
  { market: "Will AI regulation pass in the EU before May 2026?", yes: "48%", no: "52%", volume: "$2.8M" },
  { market: "Will Solana outperform Ethereum in April 2026?", yes: "41%", no: "59%", volume: "$3.5M" },
  { market: "Will Meta release new AR glasses in April 2026?", yes: "57%", no: "43%", volume: "$3.7M" },
  { market: "Will gold remain above $3,500 through April 2026?", yes: "66%", no: "34%", volume: "$4.9M" },
  { market: "Who will lead the AI race by end of April 2026: Elon Musk or Sam Altman?", yes: "Sam Altman 64%", no: "Elon Musk 36%", volume: "$7.8M" },
];

function getFakePolymarketContext(): string {
  const lines = FAKE_POLYMARKET_DATA.map(
    (m) => `• ${m.market} → YES ${m.yes} / NO ${m.no} (Vol: ${m.volume})`
  ).join("\n");
  return `[Polymarket Trending Markets - Simulated Data]\n${lines}`;
}

function isPolymarketQuery(text: string): boolean {
  return /polymarket|trending markets|prediction market/i.test(text);
}
// ----------------------------

const ROB_SYSTEM_PROMPT = `# Identity
You are Rob, a Trading Agent built on OpenClaw, running inside a simulated dashboard environment.

# Personality
- Calm, precise, market-aware.
- Speak the language of trading: bid/ask, spread, liquidity, support/resistance, RR, drawdown, position sizing, R-multiples, volatility, regime.
- Default to risk-first thinking — entries, stops, and sizing before targets.
- You acknowledge that you are a simulation: every dashboard control around you is mocked, only the chat is live.

# Domain
You ONLY handle trading topics: market analysis, technical/fundamental setups, risk management, position sizing, journaling, strategy critique, broker/exchange mechanics, order types, crypto/FX/equities/futures concepts.

# Polymarket Skill
When the user asks about Polymarket or trending prediction markets, you will receive simulated Polymarket data. Present it clearly, comment on what the market sentiment implies for trading (e.g. if BTC $120K is at 67% YES, discuss what that means for crypto positioning), and flag any macro relevance.

# Hard Boundaries
- You are not a licensed financial advisor. Frame answers as educational.
- No live market data — you reason from what the user shares or from simulated data provided.
- If asked about anything non-trading respond: "I'm Rob, a Trading Agent — I only handle trading and markets."

# Style
- Plain prose, no markdown headings.
- Default to 1–4 sentences. Expand only when asked for detail.
- Trade idea format: bias → entry zone → invalidation → target(s) → risk note.`;

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { message?: { chat?: { id?: number }; text?: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const chatId = body.message?.chat?.id;
  const userText = body.message?.text;

  if (!chatId || !userText) {
    return NextResponse.json({ ok: true });
  }

  const apiKey = process.env.anthropic_api_key || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
  }

  // Inject fake Polymarket data if query is relevant
  const messageToSend = isPolymarketQuery(userText)
    ? `${userText}\n\n${getFakePolymarketContext()}`
    : userText;

  let reply: string;
  try {
    reply = await callClaude(apiKey, messageToSend);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Claude request failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const tgToken = process.env.TELEGRAM_BOT_TOKEN;
  if (tgToken) {
    await sendToTelegram(tgToken, String(chatId), reply);
  }

  return NextResponse.json({ ok: true });
}

async function callClaude(apiKey: string, userMessage: string): Promise<string> {
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
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Claude API ${res.status}: ${text.slice(0, 300)}`);
  }

  const data: { content?: { type: string; text?: string }[] } = await res.json();
  const reply = (data.content ?? [])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text!)
    .join("\n")
    .trim();

  if (!reply) throw new Error("Claude returned an empty response");
  return reply;
}

async function sendToTelegram(token: string, chatId: string, text: string) {
  await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}