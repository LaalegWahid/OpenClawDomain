import { NextResponse } from "next/server";
import { getSessionOrThrow } from "@/shared/lib/auth/getSessionOrThrow";
import { db } from "@/shared/lib/drizzle";
import { telegramLinkToken } from "@/shared/db/schema/telegram";
import { env } from "@/shared/config/env";

export async function POST(req: Request) {
  try {
    const session = await getSessionOrThrow(req);

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await db.insert(telegramLinkToken).values({
      token,
      userId: session.user.id,
      expiresAt,
    });

    return NextResponse.json({
      url: `https://t.me/${env.TELEGRAM_BOT_USERNAME}?start=${token}`,
    });
  } catch (err) {
    if (err instanceof Response) {
      return err;
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
