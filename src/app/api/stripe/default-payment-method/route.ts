import { NextResponse } from "next/server";
import { getSessionOrThrow } from "@/shared/lib/auth/getSessionOrThrow";
import { setDefaultPaymentMethod } from "@/shared/lib/stripe/stripe.service";
import { logger } from "@/shared/lib/logger";

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

    await setDefaultPaymentMethod(session.user.id, paymentMethodId);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to set default payment method");
    return NextResponse.json(
      { error: "Failed to set default payment method" },
      { status: 500 },
    );
  }
}
