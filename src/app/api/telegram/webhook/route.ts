import { NextResponse } from "next/server";
import { validateWebhookSecret } from "@/shared/lib/telegram/bot";
import { handleStartCommand } from "@/shared/lib/telegram/link";
import { sendMessage } from "@/shared/lib/telegram/bot";

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
  const username = message.from?.username ?? "";
  const text = message.text.trim();

  const startMatch = text.match(/^\/start\s+(.+)$/);

  if (startMatch) {
    await handleStartCommand(chatId, username, startMatch[1]);
  } else {
    await sendMessage(chatId, "Account linking only for now.");
  }

  return NextResponse.json({ ok: true });
}
