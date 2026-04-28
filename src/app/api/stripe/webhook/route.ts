import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { stripe } from "../../../../shared/lib/stripe";
import { logger } from "../../../../shared/lib/logger";
import { db } from "../../../../shared/lib/drizzle";
import { processedStripeEvent, subscription, agentSubscription } from "../../../../shared/db/schema";
import { syncSubscription, syncAgentSubscription } from "../../../../shared/lib/stripe/stripe.service";
import { env } from "../../../../shared/config/env";

async function dispatchSubscriptionSync(stripeSubscriptionId: string) {
  const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  if (stripeSub.metadata?.agentId) {
    await syncAgentSubscription(stripeSubscriptionId);
  } else {
    await syncSubscription(stripeSubscriptionId);
  }
}

export async function POST(req: Request) {
  let event;

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }
    event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error({ err }, "Webhook signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await db.insert(processedStripeEvent).values({ eventId: event.id });
  } catch {
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.subscription) {
          const subId = typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;
          await dispatchSubscriptionSync(subId);
        }
        break;
      }
      case "customer.subscription.updated": {
        await dispatchSubscriptionSync(event.data.object.id);
        break;
      }
      case "customer.subscription.deleted": {
        const stripeSubId = event.data.object.id;
        const isAgentSub = !!event.data.object.metadata?.agentId;
        if (isAgentSub) {
          await db
            .update(agentSubscription)
            .set({ status: "canceled", canceledAt: new Date() })
            .where(eq(agentSubscription.stripeSubscriptionId, stripeSubId));
        } else {
          await db
            .update(subscription)
            .set({ status: "canceled", canceledAt: new Date() })
            .where(eq(subscription.stripeSubscriptionId, stripeSubId));
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as { subscription?: string | { id: string } };
        const subId = typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id;
        if (subId) {
          // Try both — only the matching row will update
          await db
            .update(subscription)
            .set({ status: "past_due" })
            .where(eq(subscription.stripeSubscriptionId, subId));
          await db
            .update(agentSubscription)
            .set({ status: "past_due" })
            .where(eq(agentSubscription.stripeSubscriptionId, subId));
        }
        break;
      }
    }
  } catch (err) {
    logger.error({ err, eventType: event.type }, "Webhook handler error");
    return NextResponse.json({ error: "Stripe webhook handler threw an error. Check server logs for event details." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}