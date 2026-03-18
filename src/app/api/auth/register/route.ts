import { NextResponse } from "next/server";
import { auth } from "@/shared/lib/auth/server";
import { db } from "@/shared/lib/drizzle";
import { user } from "@/shared/db/schema/auth";
import { eq } from "drizzle-orm";
import { logger } from "@/shared/lib/logger";

export async function POST(req: Request) {
  try {
    const { name, email, password, telegramId, telegramUsername } =
      await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "name, email, and password are required" },
        { status: 400 },
      );
    }

    // Create account via better-auth
    const result = await auth.api.signUpEmail({
      body: { name, email, password },
    });

    if (!result?.user?.id) {
      return NextResponse.json(
        { error: "Failed to create account" },
        { status: 500 },
      );
    }

    // Link Telegram if provided
    if (telegramId) {
      await db
        .update(user)
        .set({
          telegramId: String(telegramId),
          telegramUsername: telegramUsername || null,
        })
        .where(eq(user.id, result.user.id));
    }

    logger.info({ userId: result.user.id, email }, "User registered");
    return NextResponse.json({ ok: true, userId: result.user.id });
  } catch (err) {
    if (err instanceof Error && err.message.includes("UNIQUE")) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 },
      );
    }
    logger.error({ err }, "Registration failed");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
