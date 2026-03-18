import { NextResponse } from "next/server";
import { validateWebhookSecret } from "@/shared/lib/telegram/bot";
import { handleStartCommand } from "@/shared/lib/telegram/link";
import { sendMessage } from "@/shared/lib/telegram/bot";
import { handleStatusCommand, handleAgentCommand } from "@/shared/lib/telegram/commands";
import { logger } from "@/shared/lib/logger";

export async function POST(req: Request) {
  if (!validateWebhookSecret(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const message = body?.message;

  if (!message?.text) {
    return NextResponse.json({ ok: true });
  }

  const chatId = String(message.chat.id);
  const telegramId = String(message.from?.id);
  const username = message.from?.username ?? "";
  const text = message.text.trim();

  logger.info({ telegramId, command: text }, "Telegram command received");
  const startMatch = text.match(/^\/start\s+(.+)$/);

  if (startMatch) {
    await handleStartCommand(chatId, username, startMatch[1]);
  } else if (text === "/status") {
    await handleStatusCommand(chatId, telegramId);
  } else if (text.startsWith("/report") || text.startsWith("/alert")) {
    await handleAgentCommand(chatId, telegramId, "finance", text);
  } else if (text.startsWith("/tasks") || text.startsWith("/assign") || text.startsWith("/standup")) {
    await handleAgentCommand(chatId, telegramId, "ops", text);
  } else if (text.startsWith("/draft") || text.startsWith("/schedule") || text.startsWith("/metrics")) {
    await handleAgentCommand(chatId, telegramId, "marketing", text);
  } else {
    await sendMessage(chatId, "Available commands:\n/status — View agent statuses\n/report /alert — Finance agent\n/tasks /assign /standup — Ops agent\n/draft /schedule /metrics — Marketing agent");
  }

  return NextResponse.json({ ok: true });
}
