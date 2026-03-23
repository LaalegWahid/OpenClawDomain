import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../shared/lib/auth/getSessionOrThrow";
import { createPortalSession } from "../../../../shared/lib/stripe/stripe.service";
import { env } from "../../../../shared/config/env";
import { logger } from "../../../../shared/lib/logger";

export async function POST(req: Request) {
  try {
    const session = await getSessionOrThrow(req);
    const origin = env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;

    const portalSession = await createPortalSession(
      session.user.id,
      `${origin}/settings/billing`,
    );

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to create portal session");
    return NextResponse.json(
      { error: "Stripe billing portal session failed. Check portal configuration in Stripe dashboard." },
      { status: 500 },
    );
  }
}
