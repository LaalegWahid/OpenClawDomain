import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "../../../../shared/lib/auth/server";
import { logger } from "../../../../shared/lib/logger";
import { db } from "../../../../shared/lib/drizzle";
import { user } from "../../../../shared/db/schema/auth";
import { referral } from "../../../../shared/db/schema/referral";
import { eq, count, sql } from "drizzle-orm";

interface BetterAuthError {
  status?: number;
  body?: { message?: string; code?: string };
}

function isBetterAuthError(err: unknown): err is BetterAuthError {
  return typeof err === "object" && err !== null && "status" in err;
}

function generateReferralCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

export async function POST(req: Request) {
  // ── 1. Parse & validate body ────────────────────────────────────────────────
  let name: string, email: string, password: string, ref: string | undefined;

  try {
    ({ name, email, password, ref } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const missing = (["name", "email", "password"] as const).filter(
    (f) => !{ name, email, password }[f],
  );
  if (missing.length) {
    return NextResponse.json(
      { error: `Missing required fields: ${missing.join(", ")}` },
      { status: 400 },
    );
  }

  // ── 2. Call Better Auth ─────────────────────────────────────────────────────
  let result: Awaited<ReturnType<typeof auth.api.signUpEmail>>;

  try {
    result = await auth.api.signUpEmail({ body: { name, email, password } });
  } catch (err) {
    if (isBetterAuthError(err)) {
      const message = err.body?.message ?? "Authentication error";
      const code    = err.body?.code;
      const status  = err.status ?? 400;

      if (
        status === 409 ||
        code === "USER_ALREADY_EXISTS" ||
        message.toLowerCase().includes("already") ||
        (err instanceof Error && err.message.includes("UNIQUE"))
      ) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 },
        );
      }

      logger.warn({ err, code, status }, "Better Auth rejected sign-up");
      return NextResponse.json({ error: message }, { status });
    }

    logger.error({ err }, "Unexpected error during sign-up");
    return NextResponse.json(
      { error: "Registration failed. Please try again later." },
      { status: 500 },
    );
  }

  if (!result?.user?.id) {
    logger.error({ result }, "sign-up returned no user ID — possible DB issue");
    return NextResponse.json(
      { error: "Registration failed. Please try again later." },
      { status: 500 },
    );
  }

  const userId = result.user.id;

  // ── 3. Generate a unique referral code for the new user ──────────────────────
  let code = generateReferralCode();
  let attempts = 0;
  while (attempts < 5) {
    try {
      await db.update(user).set({ referralCode: code }).where(eq(user.id, userId));
      break;
    } catch {
      // Collision on unique constraint — try a new code
      code = generateReferralCode();
      attempts++;
    }
  }

  // ── 4. Track referral if a valid ref code was provided ───────────────────────
  if (ref) {
    try {
      const [referrer] = await db
        .select({ id: user.id, freeAgentCredits: user.freeAgentCredits })
        .from(user)
        .where(eq(user.referralCode, ref.toUpperCase()))
        .limit(1);

      if (referrer && referrer.id !== userId) {
        await db.insert(referral).values({
          referrerId: referrer.id,
          referredId: userId,
        });

        // Count total referrals for this referrer
        const [{ total }] = await db
          .select({ total: count() })
          .from(referral)
          .where(eq(referral.referrerId, referrer.id));

        // Award 1 free agent credit for every 5 referrals
        if (Number(total) % 5 === 0) {
          await db
            .update(user)
            .set({ freeAgentCredits: sql`${user.freeAgentCredits} + 1` })
            .where(eq(user.id, referrer.id));

          logger.info({ referrerId: referrer.id, total }, "Referral milestone reached — free agent credit awarded");
        }
      }
    } catch (err) {
      // Non-fatal — don't fail registration over referral tracking
      logger.warn({ err, ref }, "Failed to process referral code");
    }
  }

  logger.info({ userId, email }, "User registered");
  return NextResponse.json({ ok: true, userId }, { status: 201 });
}
