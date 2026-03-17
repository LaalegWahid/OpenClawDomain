import { eq, and, gt } from "drizzle-orm";
import { db } from "@/shared/lib/drizzle";
import { telegramLinkToken } from "@/shared/db/schema/telegram";
import { user } from "@/shared/db/schema/auth";
import { sendMessage } from "./bot";

export async function handleStartCommand(
  telegramChatId: string,
  telegramUsername: string,
  token: string,
) {
  const [linkToken] = await db
    .select()
    .from(telegramLinkToken)
    .where(
      and(
        eq(telegramLinkToken.token, token),
        eq(telegramLinkToken.used, false),
        gt(telegramLinkToken.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!linkToken) {
    await sendMessage(telegramChatId, "Invalid or expired link token.");
    return;
  }

  await db
    .update(telegramLinkToken)
    .set({ used: true })
    .where(eq(telegramLinkToken.id, linkToken.id));

  await db
    .update(user)
    .set({
      telegramId: telegramChatId,
      telegramUsername: telegramUsername,
    })
    .where(eq(user.id, linkToken.userId));

  await sendMessage(
    telegramChatId,
    "Your Telegram account has been linked successfully!",
  );
}
