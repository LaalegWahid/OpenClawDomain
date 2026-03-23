import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../shared/lib/auth/getSessionOrThrow";
import { createSetupIntent } from "../../../../shared/lib/stripe/stripe.service";
import { logger } from "../../../../shared/lib/logger";

export async function POST(req: Request) {
  try {
    const session = await getSessionOrThrow(req);
    const setupIntent = await createSetupIntent(session.user.id);

    return NextResponse.json({ clientSecret: setupIntent.client_secret });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to create setup intent");
    return NextResponse.json(
      { error: "Stripe setup intent creation failed. Check Stripe API key and customer." },
      { status: 500 },
    );
  }
}
