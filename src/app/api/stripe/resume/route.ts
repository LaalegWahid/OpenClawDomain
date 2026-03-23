import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../shared/lib/auth/getSessionOrThrow";
import { resumeSubscription } from "../../../../shared/lib/stripe/stripe.service";
import { logger } from "../../../../shared/lib/logger";

export async function POST(req: Request) {
  try {
    const session = await getSessionOrThrow(req);
    await resumeSubscription(session.user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to resume subscription");
    return NextResponse.json(
      { error: "Stripe API failed to resume subscription. Check subscription status in Stripe dashboard." },
      { status: 500 },
    );
  }
}
