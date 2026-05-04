import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../../../../../shared/lib/drizzle";
import { agent, incomingMessage } from "../../../../../../shared/db/schema/agent";
import { logger } from "../../../../../../shared/lib/logger";

/**
 * OpenClaw cron POSTs the finished-job payload here when registered with
 * `--webhook <url>`. We forward it to Telegram via the bot's sendMessage
 * endpoint. Auth is via `?token=<GATEWAY_TOKEN>` since OpenClaw's webhook
 * caller does not (per docs) include auth headers.
 *
 * The exact body shape OpenClaw sends is not documented — we read several
 * common fields and fall back to JSON.stringify so the first delivery
 * surfaces the real shape in logs even if the format changes.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: agentId } = await params;
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token || token !== process.env.GATEWAY_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    try {
      body = await req.text();
    } catch {
      body = null;
    }
  }
  logger.info({ agentId, body }, "cron webhook payload received");

  const b = (body ?? {}) as Record<string, unknown>;
  const text: string =
    typeof b.message === "string" ? b.message :
    typeof b.result === "string" ? b.result :
    typeof b.output === "string" ? b.output :
    typeof b.text === "string" ? b.text :
    typeof b.content === "string" ? b.content :
    typeof body === "string" ? (body as string) :
    JSON.stringify(body);

  if (!text) {
    return NextResponse.json({ error: "no text in payload" }, { status: 400 });
  }

  const [agentRow] = await db
    .select({ botToken: agent.botToken, botUsername: agent.botUsername })
    .from(agent)
    .where(eq(agent.id, agentId))
    .limit(1);
  if (!agentRow) {
    return NextResponse.json({ error: "agent not found" }, { status: 404 });
  }

  const username = agentRow.botUsername ?? "";
  if (username.startsWith("whatsapp_") || username.startsWith("discord_")) {
    return NextResponse.json(
      { error: "platform not supported for cron delivery yet" },
      { status: 400 },
    );
  }

  const [chat] = await db
    .select({ chatId: incomingMessage.chatId })
    .from(incomingMessage)
    .where(and(eq(incomingMessage.agentId, agentId), eq(incomingMessage.source, "telegram")))
    .orderBy(desc(incomingMessage.createdAt))
    .limit(1);
  if (!chat) {
    logger.warn({ agentId }, "cron output ready but no inbound Telegram chat exists for delivery");
    return NextResponse.json({ ok: false, reason: "no_chat_id" });
  }

  const tgRes = await fetch(`https://api.telegram.org/bot${agentRow.botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat.chatId, text }),
  });
  if (!tgRes.ok) {
    const detail = await tgRes.text().catch(() => "");
    logger.error(
      { agentId, chatId: chat.chatId, status: tgRes.status, detail },
      "Telegram sendMessage failed",
    );
    return NextResponse.json({ error: "telegram delivery failed" }, { status: 502 });
  }

  logger.info({ agentId, chatId: chat.chatId }, "cron output delivered to Telegram");
  return NextResponse.json({ ok: true });
}
