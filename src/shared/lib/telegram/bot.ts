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
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram setWebhook failed: ${data.description ?? "unknown error"}`);
  }
}

export async function deleteWebhook(token: string): Promise<void> {
  const res = await fetch(`${TELEGRAM_API}${token}/deleteWebhook`, {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error(`Failed to delete webhook: ${res.status}`);
  }
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram deleteWebhook failed: ${data.description ?? "unknown error"}`);
  }
}

export async function sendDocument(
  token: string,
  chatId: string,
  fileBuffer: Buffer,
  filename: string,
  caption?: string,
) {
  const formData = new FormData();
  formData.append("chat_id", chatId);
  const safeFilename = filename.replace(/[^\x20-\x7E]/g, '-');
  const file = new File([new Uint8Array(fileBuffer)], safeFilename, { type: "application/pdf" });
  formData.append("document", file);
  if (caption) {
    formData.append("caption", caption.slice(0, 1024));
  }

  const res = await fetch(`${TELEGRAM_API}${token}/sendDocument`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const status = res.status;
    if (status === 403) {
      throw new Error("Bot was blocked by the user");
    }
    throw new Error(`Telegram sendDocument failed: ${status}`);
  }

  return res.json();
}

export async function sendChatAction(
  token: string,
  chatId: string,
  action: "typing" | "upload_document" = "typing",
): Promise<void> {
  const res = await fetch(`${TELEGRAM_API}${token}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action }),
  });
  if (!res.ok) {
    throw new Error(`Telegram sendChatAction failed: ${res.status}`);
  }
}

const TELEGRAM_MAX_LENGTH = 4096;

export async function sendMessage(token: string, chatId: string, text: string) {
  // Split into chunks if text exceeds Telegram's 4096 char limit
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += TELEGRAM_MAX_LENGTH) {
    chunks.push(text.slice(i, i + TELEGRAM_MAX_LENGTH));
  }
  if (chunks.length === 0) chunks.push(text);

  let lastResult;
  for (const chunk of chunks) {
    const res = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: chunk }),
    });

    if (!res.ok) {
      const status = res.status;
      if (status === 403) {
        throw new Error("Bot was blocked by the user");
      }
      throw new Error(`Telegram sendMessage failed: ${status}`);
    }

    lastResult = await res.json();
  }

  return lastResult;
}
