import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../shared/lib/auth/getSessionOrThrow";
import {
  getSavedPaymentMethods,
  attachPaymentMethod,
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
      { error: "Internal server error" },
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
    return NextResponse.json({ paymentMethod: pm }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to attach payment method");
    return NextResponse.json(
      { error: "Failed to attach payment method" },
      { status: 500 },
    );
  }
}
