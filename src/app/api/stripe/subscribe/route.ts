import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../shared/lib/auth/getSessionOrThrow";
import { createSubscription } from "../../../../shared/lib/stripe/stripe.service";
import { logger } from "../../../../shared/lib/logger";

export async function POST(req: Request) {
  try {
    const session = await getSessionOrThrow(req);
    const { paymentMethodId } = await req.json();

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: "paymentMethodId is required" },
        { status: 400 },
      );
    }

    const result = await createSubscription(session.user.id, paymentMethodId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to create subscription");
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 },
    );
  }
}
