import { NextResponse } from "next/server";
import { stripe } from "@/shared/lib/stripe";
import { syncSubscription } from "@/shared/lib/stripe/stripe.service";
import { env } from "@/shared/config/env";
import { db } from "@/shared/lib/drizzle";
import { subscription } from "@/shared/db/schema/subscription";
import { eq } from "drizzle-orm";
import { logger } from "@/shared/lib/logger";

const processedEvents = new Set<string>();
const MAX_CACHE_SIZE = 1000;

function isDuplicate(eventId: string): boolean {
  if (processedEvents.has(eventId)) return true;
  if (processedEvents.size >= MAX_CACHE_SIZE) {
    const first = processedEvents.values().next().value!;
    processedEvents.delete(first);
  }
  processedEvents.add(eventId);
  return false;
}

export async function POST(req: Request) {
  let event;

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    logger.error({ err }, "Webhook signature verification failed");
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 },
    );
  }

  if (isDuplicate(event.id)) {
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.subscription) {
          const subId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          await syncSubscription(subId);
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        await syncSubscription(sub.id);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await db
          .update(subscription)
          .set({ status: "canceled", canceledAt: new Date() })
          .where(eq(subscription.stripeSubscriptionId, sub.id));
        logger.info({ subscriptionId: sub.id }, "Subscription canceled");
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as unknown as Record<string, unknown>;
        const invoiceSub = invoice.subscription;
        if (invoiceSub) {
          const subId =
            typeof invoiceSub === "string"
              ? invoiceSub
              : (invoiceSub as { id: string }).id;
          await db
            .update(subscription)
            .set({ status: "past_due" })
            .where(eq(subscription.stripeSubscriptionId, subId));
          logger.warn({ subscriptionId: subId }, "Payment failed, marked past_due");
        }
        break;
      }
    }
  } catch (err) {
    logger.error({ err, eventType: event.type }, "Webhook handler error");
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
