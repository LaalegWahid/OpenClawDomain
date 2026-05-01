import { eq, and, inArray, like } from "drizzle-orm";
import { stripe } from "./index";
import { db } from "../drizzle";
import {
  paymentMethod,
  subscription,
  agentSubscription,
  user,
  userProfile,
} from "../../db/schema";
import { env } from "../../config/env";
import { logger } from "../logger";

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

export async function createSubscription(userId: string, paymentMethodId: string) {
  const customerId = await ensureStripeCustomer(userId);

  // Attach payment method and set as default
  await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  // Create subscription
  const sub = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: env.STRIPE_PRICE_ID }],
    default_payment_method: paymentMethodId,
    metadata: { userId },
    expand: ["latest_invoice.payment_intent"],
  });

  // Save payment method locally
  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  const card = pm.card;

  // Clear existing default, set new one
  await db
    .update(paymentMethod)
    .set({ isDefault: false })
    .where(eq(paymentMethod.userId, userId));

  await db.insert(paymentMethod).values({
    userId,
    stripePaymentMethodId: paymentMethodId,
    brand: card?.brand ?? null,
    last4: card?.last4 ?? null,
    expMonth: card?.exp_month ?? null,
    expYear: card?.exp_year ?? null,
    isDefault: true,
  }).onConflictDoNothing();

  // Sync subscription to local DB
  await syncSubscription(sub.id);

  // Check if payment requires additional action (3D Secure)
  const latestInvoice = sub.latest_invoice as unknown as Record<string, unknown> | null;
  if (latestInvoice && typeof latestInvoice !== "string") {
    const paymentIntent = latestInvoice.payment_intent as Record<string, unknown> | string | null;
    if (paymentIntent && typeof paymentIntent !== "string") {
      if (paymentIntent.status === "requires_action") {
        return {
          status: "requires_action",
          clientSecret: paymentIntent.client_secret as string,
          subscriptionId: sub.id,
        };
      }
    }
  }

  return {
    status: sub.status,
    subscriptionId: sub.id,
  };
}

export async function updateCard(userId: string, paymentMethodId: string) {
  const customerId = await ensureStripeCustomer(userId);

  // Attach new payment method
  await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });

  // Set as default on customer
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  // Update subscription default payment method if exists
  const [sub] = await db
    .select()
    .from(subscription)
    .where(eq(subscription.userId, userId));

  if (sub?.stripeSubscriptionId) {
    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      default_payment_method: paymentMethodId,
    });
  }

  // Get card details
  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  const card = pm.card;

  // Clear old default, insert new
  await db
    .update(paymentMethod)
    .set({ isDefault: false })
    .where(eq(paymentMethod.userId, userId));

  await db.insert(paymentMethod).values({
    userId,
    stripePaymentMethodId: paymentMethodId,
    brand: card?.brand ?? null,
    last4: card?.last4 ?? null,
    expMonth: card?.exp_month ?? null,
    expYear: card?.exp_year ?? null,
    isDefault: true,
  }).onConflictDoNothing();

  logger.info({ userId }, "Payment card updated");
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

// ─── Per-agent subscriptions ──────────────────────────────────────────────────

export async function getDefaultPaymentMethod(userId: string) {
  const methods = await getSavedPaymentMethods(userId);
  return methods.find((m) => m.isDefault) ?? methods[0] ?? null;
}

export async function hasUsablePaymentMethod(userId: string): Promise<boolean> {
  const pm = await getDefaultPaymentMethod(userId);
  return !!pm;
}

/**
 * Volume-based tier pricing for agent subscriptions:
 *  • 1–5 active agents  → STRIPE_PRICE_ID            ($30/agent/mo)
 *  • 6–10 active agents → STRIPE_PRICE_ID_TIER_10    ($29/agent/mo)
 *  • 11+ active agents  → STRIPE_PRICE_ID_TIER_20    ($28/agent/mo)
 *
 * Falls back to the next-lower tier when an env var is unset so non-prod
 * environments (which only configure STRIPE_PRICE_ID) keep working.
 */
export function pickAgentPriceId(activeAgentCount: number): string {
  if (activeAgentCount >= 11) {
    return env.STRIPE_PRICE_ID_TIER_20 ?? env.STRIPE_PRICE_ID_TIER_10 ?? env.STRIPE_PRICE_ID;
  }
  if (activeAgentCount >= 6) {
    return env.STRIPE_PRICE_ID_TIER_10 ?? env.STRIPE_PRICE_ID;
  }
  return env.STRIPE_PRICE_ID;
}

export async function countActivePaidAgentSubscriptions(userId: string): Promise<number> {
  // Exclude developer/free trial/free referral pseudo-subscriptions — only real Stripe subs are billed.
  const rows = await db
    .select({ stripeSubscriptionId: agentSubscription.stripeSubscriptionId })
    .from(agentSubscription)
    .where(
      and(
        eq(agentSubscription.userId, userId),
        inArray(agentSubscription.status, ["active", "past_due", "incomplete"] as const),
      ),
    );
  return rows.filter(
    (r) =>
      r.stripeSubscriptionId &&
      !r.stripeSubscriptionId.startsWith("developer_") &&
      !r.stripeSubscriptionId.startsWith("free_trial_") &&
      !r.stripeSubscriptionId.startsWith("free_referral_"),
  ).length;
}

/**
 * Repoints every active paid agent subscription for a user to a new tier price.
 * Called after the user crosses a volume threshold so existing agents inherit
 * the new lower price.
 */
export async function repriceUserAgentSubscriptions(
  userId: string,
  newPriceId: string,
  excludeAgentId?: string,
) {
  const rows = await db
    .select({
      agentId: agentSubscription.agentId,
      stripeSubscriptionId: agentSubscription.stripeSubscriptionId,
      stripePriceId: agentSubscription.stripePriceId,
    })
    .from(agentSubscription)
    .where(
      and(
        eq(agentSubscription.userId, userId),
        inArray(agentSubscription.status, ["active", "past_due"] as const),
      ),
    );

  for (const row of rows) {
    if (!row.stripeSubscriptionId) continue;
    if (
      row.stripeSubscriptionId.startsWith("developer_") ||
      row.stripeSubscriptionId.startsWith("free_trial_") ||
      row.stripeSubscriptionId.startsWith("free_referral_")
    ) continue;
    if (row.stripePriceId === newPriceId) continue;
    if (excludeAgentId && row.agentId === excludeAgentId) continue;

    try {
      const remote = await stripe.subscriptions.retrieve(row.stripeSubscriptionId);
      const itemId = remote.items.data[0]?.id;
      if (!itemId) continue;
      await stripe.subscriptions.update(row.stripeSubscriptionId, {
        items: [{ id: itemId, price: newPriceId }],
        proration_behavior: "create_prorations",
      });
      await db
        .update(agentSubscription)
        .set({ stripePriceId: newPriceId })
        .where(eq(agentSubscription.stripeSubscriptionId, row.stripeSubscriptionId));
    } catch (err) {
      logger.warn(
        { err, userId, stripeSubscriptionId: row.stripeSubscriptionId },
        "Failed to reprice existing agent subscription",
      );
    }
  }
}

export async function createAgentSubscription(
  userId: string,
  agentId: string,
  priceId?: string,
): Promise<{ status: string; subscriptionId: string; clientSecret?: string }> {
  const customerId = await ensureStripeCustomer(userId);
  const pm = await getDefaultPaymentMethod(userId);
  if (!pm) {
    throw new Error("NoPaymentMethod");
  }

  const resolvedPriceId = priceId ?? env.STRIPE_PRICE_ID;

  const sub = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: resolvedPriceId }],
    default_payment_method: pm.stripePaymentMethodId,
    metadata: { userId, agentId },
    expand: ["latest_invoice.payment_intent"],
  });

  await db.insert(agentSubscription).values({
    userId,
    agentId,
    stripeSubscriptionId: sub.id,
    stripePriceId: sub.items.data[0]?.price.id ?? null,
    status: sub.status as "incomplete" | "active" | "past_due" | "canceled" | "unpaid",
    currentPeriodStart: sub.items.data[0]?.current_period_start
      ? new Date(sub.items.data[0].current_period_start * 1000)
      : null,
    currentPeriodEnd: sub.items.data[0]?.current_period_end
      ? new Date(sub.items.data[0].current_period_end * 1000)
      : null,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  });

  const latestInvoice = sub.latest_invoice as unknown as Record<string, unknown> | null;
  if (latestInvoice && typeof latestInvoice !== "string") {
    const paymentIntent = latestInvoice.payment_intent as Record<string, unknown> | string | null;
    if (paymentIntent && typeof paymentIntent !== "string" && paymentIntent.status === "requires_action") {
      return {
        status: "requires_action",
        subscriptionId: sub.id,
        clientSecret: paymentIntent.client_secret as string,
      };
    }
  }

  return { status: sub.status, subscriptionId: sub.id };
}

export async function syncAgentSubscription(stripeSubscriptionId: string) {
  const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const agentIdMeta = stripeSub.metadata?.agentId;
  if (!agentIdMeta) return false;

  const values = {
    stripePriceId: stripeSub.items.data[0]?.price.id ?? null,
    status: stripeSub.status as "incomplete" | "active" | "past_due" | "canceled" | "unpaid",
    currentPeriodStart: stripeSub.items.data[0]?.current_period_start
      ? new Date(stripeSub.items.data[0].current_period_start * 1000)
      : null,
    currentPeriodEnd: stripeSub.items.data[0]?.current_period_end
      ? new Date(stripeSub.items.data[0].current_period_end * 1000)
      : null,
    cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
    canceledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
  };

  await db
    .update(agentSubscription)
    .set(values)
    .where(eq(agentSubscription.stripeSubscriptionId, stripeSubscriptionId));

  return true;
}

export async function cancelAgentSubscription(agentId: string) {
  const [row] = await db
    .select()
    .from(agentSubscription)
    .where(eq(agentSubscription.agentId, agentId));

  if (!row?.stripeSubscriptionId) return;

  // Cancel immediately on agent deletion
  try {
    await stripe.subscriptions.cancel(row.stripeSubscriptionId);
  } catch (err) {
    logger.warn({ err, agentId }, "Stripe cancel failed (will still mark canceled in DB)");
  }

  await db
    .update(agentSubscription)
    .set({ status: "canceled", canceledAt: new Date(), cancelAtPeriodEnd: false })
    .where(eq(agentSubscription.agentId, agentId));
}

export async function getAgentSubscriptionsForUser(userId: string) {
  return db
    .select()
    .from(agentSubscription)
    .where(eq(agentSubscription.userId, userId));
}

/**
 * Wipe everything Stripe knows about this user. Deleting the customer in
 * Stripe automatically cancels all of their subscriptions and detaches
 * payment methods, so a single delete is enough on the Stripe side. Local
 * subscription/payment_method rows cascade away when the user row is deleted.
 *
 * Best-effort — if Stripe is unreachable or the customer is already gone,
 * we log and continue so account deletion isn't blocked by an external API.
 */
export async function deleteStripeCustomerForUser(userId: string): Promise<void> {
  const [profile] = await db
    .select({ stripeCustomerId: userProfile.stripeCustomerId })
    .from(userProfile)
    .where(eq(userProfile.userId, userId));

  if (!profile?.stripeCustomerId) return;

  try {
    await stripe.customers.del(profile.stripeCustomerId);
    logger.info({ userId, stripeCustomerId: profile.stripeCustomerId }, "Stripe customer deleted");
  } catch (err) {
    logger.warn({ err, userId, stripeCustomerId: profile.stripeCustomerId }, "Stripe customer deletion failed");
  }
}

/**
 * Convert every still-active free-trial agent for this user into a real
 * Stripe-billed subscription using the volume tier appropriate for their new
 * paid count. Called right after a payment method is attached so the trial
 * agents transition to paid without being deactivated.
 *
 * Best-effort per agent — failures are logged so a single bad agent doesn't
 * block the rest from converting.
 */
export async function convertActiveFreeTrialsToPaid(userId: string): Promise<number> {
  const trials = await db
    .select({
      id: agentSubscription.id,
      agentId: agentSubscription.agentId,
      stripeSubscriptionId: agentSubscription.stripeSubscriptionId,
    })
    .from(agentSubscription)
    .where(
      and(
        eq(agentSubscription.userId, userId),
        eq(agentSubscription.status, "active"),
        like(agentSubscription.stripeSubscriptionId, "free_trial_%"),
      ),
    );

  if (trials.length === 0) return 0;

  const customerId = await ensureStripeCustomer(userId);
  const pm = await getDefaultPaymentMethod(userId);
  if (!pm) return 0;

  // The new paid count = existing paid + every trial we are about to convert.
  const existingPaid = await countActivePaidAgentSubscriptions(userId);
  const totalAfter = existingPaid + trials.length;
  const priceId = pickAgentPriceId(totalAfter);

  let converted = 0;

  for (const row of trials) {
    if (!row.agentId) continue;
    try {
      const sub = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        default_payment_method: pm.stripePaymentMethodId,
        metadata: { userId, agentId: row.agentId, convertedFrom: "free_trial" },
        expand: ["latest_invoice.payment_intent"],
      });

      await db
        .update(agentSubscription)
        .set({
          stripeSubscriptionId: sub.id,
          stripePriceId: sub.items.data[0]?.price.id ?? priceId,
          status: sub.status as "incomplete" | "active" | "past_due" | "canceled" | "unpaid",
          currentPeriodStart: sub.items.data[0]?.current_period_start
            ? new Date(sub.items.data[0].current_period_start * 1000)
            : new Date(),
          currentPeriodEnd: sub.items.data[0]?.current_period_end
            ? new Date(sub.items.data[0].current_period_end * 1000)
            : null,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          canceledAt: null,
        })
        .where(eq(agentSubscription.id, row.id));

      converted++;
      logger.info(
        { userId, agentId: row.agentId, stripeSubscriptionId: sub.id },
        "Free-trial agent converted to paid subscription",
      );
    } catch (err) {
      logger.error(
        { err, userId, agentId: row.agentId },
        "Failed to convert free-trial agent to paid",
      );
    }
  }

  // Make sure pre-existing paid subs match the new tier (e.g. converting the
  // 6th agent should drop everyone to the $29 tier).
  if (converted > 0) {
    await repriceUserAgentSubscriptions(userId, priceId).catch((err) => {
      logger.warn({ err, userId }, "Reprice after trial conversion failed");
    });
  }

  return converted;
}
