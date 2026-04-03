const DISCORD_API = "https://discord.com/api/v10";

const DISCORD_MAX_LENGTH = 2000;

export async function sendDiscordMessage(
  token: string,
  channelId: string,
  content: string,
): Promise<void> {
  const chunks: string[] = [];
  for (let i = 0; i < content.length; i += DISCORD_MAX_LENGTH) {
    chunks.push(content.slice(i, i + DISCORD_MAX_LENGTH));
  }
  if (chunks.length === 0) chunks.push(content);

  for (const chunk of chunks) {
    const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bot ${token}`,
      },
      body: JSON.stringify({ content: chunk }),
    });

    if (!res.ok) {
      throw new Error(`Discord sendMessage failed: ${res.status}`);
    }
  }
}

export async function sendDiscordDocument(
  token: string,
  channelId: string,
  buffer: Buffer,
  filename: string,
  caption: string,
): Promise<void> {
  const safeFilename = filename.replace(/[^\x20-\x7E]/g, "-");
  const formData = new FormData();
  const file = new File([new Uint8Array(buffer)], safeFilename, { type: "application/pdf" });
  formData.append("files[0]", file);
  formData.append("content", caption);

  const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: "POST",
    headers: { "Authorization": `Bot ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Discord sendDocument failed: ${res.status} ${text}`);
  }
}
