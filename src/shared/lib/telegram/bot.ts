const TELEGRAM_API = "https://api.telegram.org/bot";

export async function validateBotToken(token: string): Promise<{ ok: true; username: string; botId: number }> {
  const res = await fetch(`${TELEGRAM_API}${token}/getMe`);
  if (!res.ok) {
    throw new Error("Invalid bot token");
  }
  const data = await res.json();
  if (!data.ok) {
    throw new Error("Bot token validation failed");
  }
  return { ok: true, username: data.result.username, botId: data.result.id };
}

export async function setWebhook(token: string, url: string, secret?: string): Promise<void> {
  const body: Record<string, string> = { url };
  if (secret) body.secret_token = secret;

  const res = await fetch(`${TELEGRAM_API}${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Failed to set webhook: ${res.status}`);
  }
}

export async function deleteWebhook(token: string): Promise<void> {
  const res = await fetch(`${TELEGRAM_API}${token}/deleteWebhook`, {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error(`Failed to delete webhook: ${res.status}`);
  }
}

export async function sendMessage(token: string, chatId: string, text: string) {
  const res = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!res.ok) {
    const status = res.status;
    if (status === 403) {
      throw new Error("Bot was blocked by the user");
    }
    throw new Error(`Telegram sendMessage failed: ${status}`);
  }

  return res.json();
}
