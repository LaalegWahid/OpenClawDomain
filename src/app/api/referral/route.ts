import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSessionOrThrow } from "../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../shared/lib/drizzle";
import { user } from "../../../shared/db/schema/auth";
import { referral } from "../../../shared/db/schema/referral";
import { eq, count } from "drizzle-orm";

function generateReferralCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

export async function GET(req: Request) {
  const session = await getSessionOrThrow(req);

  // Fetch user's referral code and credits
  let referralCode: string | null = null;
  let freeAgentCredits = 0;

  try {
    const [me] = await db
      .select({ referralCode: user.referralCode, freeAgentCredits: user.freeAgentCredits })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    referralCode = me?.referralCode ?? null;
    freeAgentCredits = me?.freeAgentCredits ?? 0;

    // Backfill: generate a code for users who registered before this feature
    if (!referralCode) {
      let code = generateReferralCode();
      for (let i = 0; i < 5; i++) {
        try {
          await db.update(user).set({ referralCode: code }).where(eq(user.id, session.user.id));
          referralCode = code;
          break;
        } catch {
          code = generateReferralCode();
        }
      }
    }
  } catch {
    // user table query failed — return safe defaults
    return NextResponse.json({ referralCode: null, referralCount: 0, freeAgentCredits: 0 });
  }

  // Referral count — isolated so a missing table doesn't break the whole response
  let referralCount = 0;
  try {
    const [{ total }] = await db
      .select({ total: count() })
      .from(referral)
      .where(eq(referral.referrerId, session.user.id));
    referralCount = Number(total);
  } catch {
    // referral table may not exist yet — just return 0
  }

  return NextResponse.json({ referralCode, referralCount, freeAgentCredits });
}
