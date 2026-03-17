import { env } from "@/shared/config/env";

const BASE_URL = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`;

export async function sendMessage(chatId: string, text: string) {
  const res = await fetch(`${BASE_URL}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!res.ok) {
    throw new Error(`Telegram sendMessage failed: ${res.status}`);
  }

  return res.json();
}

export function validateWebhookSecret(req: Request): boolean {
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  return secret === env.TELEGRAM_WEBHOOK_SECRET;
}
