import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../../shared/lib/auth/getSessionOrThrow";
import { deletePaymentMethod } from "../../../../../shared/lib/stripe/stripe.service";
import { logger } from "../../../../../shared/lib/logger";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionOrThrow(req);
    const { id } = await params;

    await deletePaymentMethod(session.user.id, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to delete payment method");
    return NextResponse.json(
      { error: "Stripe API failed to detach payment method. Check Stripe dashboard." },
      { status: 500 },
    );
  }
}
