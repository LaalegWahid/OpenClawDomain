import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../shared/lib/auth/getSessionOrThrow";
import { getSubscriptionStatus } from "../../../../shared/lib/stripe/stripe.service";

export async function GET(req: Request) {
  try {
    const session = await getSessionOrThrow(req);
    const sub = await getSubscriptionStatus(session.user.id);

    return NextResponse.json({
      status: sub?.status ?? null,
      currentPeriodEnd: sub?.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
      stripePriceId: sub?.stripePriceId ?? null,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json(
      { error: "Unhandled error in GET /api/stripe/subscription. Check Stripe service or DB." },
      { status: 500 },
    );
  }
}
