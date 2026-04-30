import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../shared/lib/auth/getSessionOrThrow";
import {
  getSavedPaymentMethods,
  attachPaymentMethod,
  convertActiveFreeTrialsToPaid,
} from "../../../../shared/lib/stripe/stripe.service";
import { logger } from "../../../../shared/lib/logger";

export async function GET(req: Request) {
  try {
    const session = await getSessionOrThrow(req);
    const methods = await getSavedPaymentMethods(session.user.id);
    return NextResponse.json({ paymentMethods: methods });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json(
      { error: "Unhandled error in GET /api/stripe/payment-methods. Check Stripe service or DB." },
      { status: 500 },
    );
  }
}

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

    const pm = await attachPaymentMethod(session.user.id, paymentMethodId);

    // If the user had any agents on the 15-day free trial, convert them to
    // real paid subscriptions now that there's a card on file. Best-effort —
    // failures get logged but don't block the response.
    let trialsConverted = 0;
    try {
      trialsConverted = await convertActiveFreeTrialsToPaid(session.user.id);
    } catch (err) {
      logger.warn({ err, userId: session.user.id }, "Trial-to-paid conversion failed after card attach");
    }

    return NextResponse.json({ paymentMethod: pm, trialsConverted }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to attach payment method");
    return NextResponse.json(
      { error: "Stripe API rejected payment method attachment. Check Stripe dashboard for details." },
      { status: 500 },
    );
  }
}
