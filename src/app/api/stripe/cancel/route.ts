import { NextResponse } from "next/server";
import { getSessionOrThrow } from "@/shared/lib/auth/getSessionOrThrow";
import { cancelSubscription } from "@/shared/lib/stripe/stripe.service";
import { logger } from "@/shared/lib/logger";

export async function POST(req: Request) {
  try {
    const session = await getSessionOrThrow(req);
    await cancelSubscription(session.user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to cancel subscription");
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 },
    );
  }
}
