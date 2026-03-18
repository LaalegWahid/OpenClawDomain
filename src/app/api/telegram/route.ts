import { NextResponse } from "next/server";
import { getSessionOrThrow } from "@/shared/lib/auth/getSessionOrThrow";
import { db } from "@/shared/lib/drizzle";
import { user } from "@/shared/db/schema/auth";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const session = await getSessionOrThrow(req);
    const { id, username } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Telegram ID required" }, { status: 400 });
    }

    await db
      .update(user)
      .set({
        telegramId: String(id),
        telegramUsername: username || null,
      })
      .where(eq(user.id, session.user.id));

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}