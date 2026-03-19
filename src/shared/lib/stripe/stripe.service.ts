import { eq, and } from "drizzle-orm";
import { stripe } from "./index";
import { db } from "@/shared/lib/drizzle";
import { user, userProfile } from "@/shared/db/schema/auth";
import { subscription, paymentMethod } from "@/shared/db/schema/subscription";
import { env } from "@/shared/config/env";
import { logger } from "@/shared/lib/logger";

export async function ensureStripeCustomer(userId: string): Promise<string> {
  const [profile] = await db
    .select()
    .from(userProfile)
    .where(eq(userProfile.userId, userId));

  if (profile?.stripeCustomerId) {
    return profile.stripeCustomerId;
  }

  const [u] = await db.select().from(user).where(eq(user.id, userId));
  if (!u) throw new Error("User not found");

  const customer = await stripe.customers.create({
    email: u.email,
    name: u.name,
    metadata: { userId },
  });

  if (profile) {
    await db
      .update(userProfile)
      .set({ stripeCustomerId: customer.id })
      .where(eq(userProfile.userId, userId));
  } else {
    await db.insert(userProfile).values({
      userId,
      stripeCustomerId: customer.id,
    });
  }

  return customer.id;
}

export async function createCheckoutSession(
  userId: string,
  successUrl: string,
  cancelUrl: string,
) {
  const customerId = await ensureStripeCustomer(userId);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: { userId },
    },
  });

  return session;
}

export async function createPortalSession(userId: string, returnUrl: string) {
  const customerId = await ensureStripeCustomer(userId);

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

export async function getSubscriptionStatus(userId: string) {
  const [sub] = await db
    .select()
    .from(subscription)
    .where(eq(subscription.userId, userId));

  return sub ?? null;
}

export async function syncSubscription(stripeSubscriptionId: string) {
  const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const customerId =
    typeof stripeSub.customer === "string"
      ? stripeSub.customer
      : stripeSub.customer.id;

  const [profile] = await db
    .select()
    .from(userProfile)
    .where(eq(userProfile.stripeCustomerId, customerId));

  if (!profile) {
    logger.warn({ customerId }, "No user profile found for Stripe customer");
    return;
  }

  const values = {
    userId: profile.userId,
    stripeSubscriptionId: stripeSub.id,
    stripePriceId: stripeSub.items.data[0]?.price.id ?? null,
    status: stripeSub.status as "active" | "past_due" | "canceled" | "unpaid" | "incomplete",
    currentPeriodStart: stripeSub.items.data[0]?.current_period_start
      ? new Date(stripeSub.items.data[0].current_period_start * 1000)
      : null,
    currentPeriodEnd: stripeSub.items.data[0]?.current_period_end
      ? new Date(stripeSub.items.data[0].current_period_end * 1000)
      : null,
    cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
    canceledAt: stripeSub.canceled_at
      ? new Date(stripeSub.canceled_at * 1000)
      : null,
  };

  const [existing] = await db
    .select()
    .from(subscription)
    .where(eq(subscription.userId, profile.userId));

  if (existing) {
    await db
      .update(subscription)
      .set(values)
      .where(eq(subscription.userId, profile.userId));
  } else {
    await db.insert(subscription).values(values);
  }

  logger.info(
    { stripeSubscriptionId, status: values.status },
    "Subscription synced",
  );
}

export async function getSavedPaymentMethods(userId: string) {
  return db
    .select()
    .from(paymentMethod)
    .where(eq(paymentMethod.userId, userId));
}

export async function attachPaymentMethod(
  userId: string,
  paymentMethodId: string,
) {
  const customerId = await ensureStripeCustomer(userId);

  const pm = await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });

  const card = pm.card;
  const existing = await getSavedPaymentMethods(userId);
  const isFirst = existing.length === 0;

  if (isFirst) {
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
  }

  await db.insert(paymentMethod).values({
    userId,
    stripePaymentMethodId: paymentMethodId,
    brand: card?.brand ?? null,
    last4: card?.last4 ?? null,
    expMonth: card?.exp_month ?? null,
    expYear: card?.exp_year ?? null,
    isDefault: isFirst,
  });

  return pm;
}

export async function deletePaymentMethod(
  userId: string,
  paymentMethodId: string,
) {
  const [pm] = await db
    .select()
    .from(paymentMethod)
    .where(
      and(
        eq(paymentMethod.userId, userId),
        eq(paymentMethod.stripePaymentMethodId, paymentMethodId),
      ),
    );

  if (!pm) throw new Error("Payment method not found");

  await stripe.paymentMethods.detach(paymentMethodId);

  await db
    .delete(paymentMethod)
    .where(eq(paymentMethod.stripePaymentMethodId, paymentMethodId));

  if (pm.isDefault) {
    const [next] = await db
      .select()
      .from(paymentMethod)
      .where(eq(paymentMethod.userId, userId))
      .limit(1);

    if (next) {
      await db
        .update(paymentMethod)
        .set({ isDefault: true })
        .where(eq(paymentMethod.id, next.id));

      const customerId = await ensureStripeCustomer(userId);
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: next.stripePaymentMethodId,
        },
      });
    }
  }
}

export async function setDefaultPaymentMethod(
  userId: string,
  paymentMethodId: string,
) {
  const customerId = await ensureStripeCustomer(userId);

  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  await db
    .update(paymentMethod)
    .set({ isDefault: false })
    .where(eq(paymentMethod.userId, userId));

  await db
    .update(paymentMethod)
    .set({ isDefault: true })
    .where(
      and(
        eq(paymentMethod.userId, userId),
        eq(paymentMethod.stripePaymentMethodId, paymentMethodId),
      ),
    );
}

export async function cancelSubscription(userId: string) {
  const [sub] = await db
    .select()
    .from(subscription)
    .where(eq(subscription.userId, userId));

  if (!sub?.stripeSubscriptionId) {
    throw new Error("No active subscription found");
  }

  await stripe.subscriptions.update(sub.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  await db
    .update(subscription)
    .set({ cancelAtPeriodEnd: true })
    .where(eq(subscription.userId, userId));

  logger.info({ userId }, "Subscription set to cancel at period end");
}

export async function resumeSubscription(userId: string) {
  const [sub] = await db
    .select()
    .from(subscription)
    .where(eq(subscription.userId, userId));

  if (!sub?.stripeSubscriptionId) {
    throw new Error("No subscription found");
  }

  await stripe.subscriptions.update(sub.stripeSubscriptionId, {
    cancel_at_period_end: false,
  });

  await db
    .update(subscription)
    .set({ cancelAtPeriodEnd: false, canceledAt: null })
    .where(eq(subscription.userId, userId));

  logger.info({ userId }, "Subscription resumed");
}

export async function createSetupIntent(userId: string) {
  const customerId = await ensureStripeCustomer(userId);

  return stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
  });
}
