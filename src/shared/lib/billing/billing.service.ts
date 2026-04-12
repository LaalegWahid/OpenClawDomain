/**
 * billing.service.ts
 *
 * Core pay-as-you-go billing logic for OpenClaw.
 *
 * Tier rules (auto-selected by agent count):
 *   1–5  agents  →  Starter   $20 / agent / mo
 *   6–10 agents  →  Growth    $18 / agent / mo
 *  11–20 agents  →  Scale     $15 / agent / mo
 *
 * Billing cycle: manual 30-day PaymentIntent (no Stripe Subscription object).
 * Trial:  First user's first agent = 15 days free, no card required.
 *         Day 10-14 → reminder alert.
 *         Day 15, no card → stop instance + expired alert.
 */

import { eq, and, ne, count } from "drizzle-orm";
import { db } from "../drizzle";
import { stripe } from "../stripe";
import { ensureStripeCustomer } from "../stripe/stripe.service";
import { user, userProfile } from "../../db/schema/auth";
import { subscription, paymentMethod } from "../../db/schema/subscription";
import { billingAlert, type BillingAlertType } from "../../db/schema/billing";
import { agent } from "../../db/schema/agent";
import { logger } from "../logger";

// ── Tier definitions ──────────────────────────────────────────────────────

export type Tier = "starter" | "growth" | "scale";

export interface TierInfo {
  tier: Tier;
  pricePerAgent: number;  // USD
  maxAgents: number;
}

export const TIERS: TierInfo[] = [
  { tier: "starter", pricePerAgent: 20, maxAgents: 5  },
  { tier: "growth",  pricePerAgent: 18, maxAgents: 10 },
  { tier: "scale",   pricePerAgent: 15, maxAgents: 20 },
];

export const MAX_AGENTS = 20;

/** Auto-select tier based on current agent count. */
export function calculateTier(agentCount: number): TierInfo {
  if (agentCount <= 5)  return TIERS[0]; // starter
  if (agentCount <= 10) return TIERS[1]; // growth
  return TIERS[2];                        // scale
}

/** Monthly total in cents for Stripe. */
export function calculateMonthlyAmountCents(agentCount: number): number {
  const { pricePerAgent } = calculateTier(agentCount);
  return agentCount * pricePerAgent * 100;
}

// ── Trial helpers ─────────────────────────────────────────────────────────

export const TRIAL_DAYS = 15;
export const TRIAL_REMINDER_START_DAY = 10;

export interface TrialStatus {
  isInTrial: boolean;
  trialUsed: boolean;
  daysRemaining: number;   // 0 when expired or not in trial
  daysElapsed: number;
  isExpired: boolean;
  needsReminder: boolean;  // days 10-14
  trialEndsAt: Date | null;
}

export async function getTrialStatus(userId: string): Promise<TrialStatus> {
  const [u] = await db.select().from(user).where(eq(user.id, userId));

  const empty: TrialStatus = {
    isInTrial: false,
    trialUsed: u?.trialUsed ?? false,
    daysRemaining: 0,
    daysElapsed: 0,
    isExpired: false,
    needsReminder: false,
    trialEndsAt: null,
  };

  if (!u?.trialStartedAt || !u?.trialEndsAt) return empty;

  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysElapsed = Math.floor((now.getTime() - u.trialStartedAt.getTime()) / msPerDay);
  const daysRemaining = Math.max(0, TRIAL_DAYS - daysElapsed);
  const isExpired = now > u.trialEndsAt;
  const isInTrial = !isExpired && !u.trialUsed;

  return {
    isInTrial,
    trialUsed: u.trialUsed,
    daysRemaining,
    daysElapsed,
    isExpired,
    needsReminder: isInTrial && daysElapsed >= TRIAL_REMINDER_START_DAY,
    trialEndsAt: u.trialEndsAt,
  };
}

/**
 * Called when the user creates their very first agent.
 * Sets trial timestamps on the user row and creates a subscription row in "trial" status.
 */
export async function initTrial(userId: string): Promise<void> {
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  await db
    .update(user)
    .set({ trialStartedAt: now, trialEndsAt, trialUsed: false })
    .where(eq(user.id, userId));

  // Upsert subscription row in "trial" status
  const [existing] = await db
    .select()
    .from(subscription)
    .where(eq(subscription.userId, userId));

  if (existing) {
    await db
      .update(subscription)
      .set({ status: "trial", tier: "starter", pricePerAgent: "20.00" })
      .where(eq(subscription.userId, userId));
  } else {
    await db.insert(subscription).values({
      userId,
      status: "trial",
      tier: "starter",
      pricePerAgent: "20.00",
    });
  }

  await createBillingAlert(
    userId,
    "trial_started",
    "Your first agent is active and free for 15 days. No credit card required.",
  );

  logger.info({ userId, trialEndsAt }, "Trial started");
}

/**
 * Mark the trial as used (called when trial expires or user adds a card).
 */
export async function markTrialUsed(userId: string): Promise<void> {
  await db.update(user).set({ trialUsed: true }).where(eq(user.id, userId));
}

// ── Payment method helpers ────────────────────────────────────────────────

export async function hasPaymentMethod(userId: string): Promise<boolean> {
  const methods = await db
    .select({ id: paymentMethod.id })
    .from(paymentMethod)
    .where(eq(paymentMethod.userId, userId))
    .limit(1);
  return methods.length > 0;
}

export async function getDefaultPaymentMethod(userId: string) {
  // Try default first, fall back to any
  const [defaultPm] = await db
    .select()
    .from(paymentMethod)
    .where(and(eq(paymentMethod.userId, userId), eq(paymentMethod.isDefault, true)))
    .limit(1);
  if (defaultPm) return defaultPm;

  const [anyPm] = await db
    .select()
    .from(paymentMethod)
    .where(eq(paymentMethod.userId, userId))
    .limit(1);
  return anyPm ?? null;
}

// ── Agent count helpers ───────────────────────────────────────────────────

/** Count only running/starting agents (not stopped/error). */
export async function getActiveAgentCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(agent)
    .where(
      and(
        eq(agent.userId, userId),
        ne(agent.status, "stopped"),
        ne(agent.status, "error"),
      ),
    );
  return row?.count ?? 0;
}

/** Count ALL agents regardless of status. */
export async function getTotalAgentCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(agent)
    .where(eq(agent.userId, userId));
  return row?.count ?? 0;
}

// ── Subscription upsert ───────────────────────────────────────────────────

/**
 * Sync the subscription row's tier/price based on current active agent count.
 * Called after every agent create/stop/delete.
 */
export async function syncSubscriptionTier(userId: string): Promise<void> {
  const agentCount = await getActiveAgentCount(userId);
  const { tier, pricePerAgent } = calculateTier(agentCount);

  const [existing] = await db
    .select()
    .from(subscription)
    .where(eq(subscription.userId, userId));

  const values = {
    tier,
    pricePerAgent: pricePerAgent.toFixed(2),
    agentCount,
  };

  if (existing) {
    await db
      .update(subscription)
      .set(values)
      .where(eq(subscription.userId, userId));
  } else {
    await db.insert(subscription).values({ userId, status: "active", ...values });
  }
}

// ── Billing charge ────────────────────────────────────────────────────────

export interface ChargeResult {
  success: boolean;
  amountCents: number;
  paymentIntentId?: string;
  error?: string;
}

/**
 * Charge the user for their current active agents.
 * Uses Stripe PaymentIntents — no Stripe Subscription required.
 */
export async function chargeUser(userId: string): Promise<ChargeResult> {
  const pm = await getDefaultPaymentMethod(userId);
  if (!pm) {
    return { success: false, amountCents: 0, error: "No payment method on file" };
  }

  const agentCount = await getActiveAgentCount(userId);
  if (agentCount === 0) {
    // Nothing to charge
    await db
      .update(subscription)
      .set({ lastBilledAt: new Date(), nextBilledAt: addDays(new Date(), 30) })
      .where(eq(subscription.userId, userId));
    return { success: true, amountCents: 0 };
  }

  const amountCents = calculateMonthlyAmountCents(agentCount);
  const { tier, pricePerAgent } = calculateTier(agentCount);
  const customerId = await ensureStripeCustomer(userId);

  try {
    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      customer: customerId,
      payment_method: pm.stripePaymentMethodId,
      confirm: true,
      off_session: true,
      description: `OpenClaw — ${agentCount} agent${agentCount > 1 ? "s" : ""} × $${pricePerAgent}/mo (${tier})`,
      metadata: { userId, agentCount: String(agentCount), tier },
    });

    const now = new Date();
    await db
      .update(subscription)
      .set({
        status: "active",
        tier,
        pricePerAgent: pricePerAgent.toFixed(2),
        agentCount,
        lastBilledAt: now,
        nextBilledAt: addDays(now, 30),
        lastPaymentIntentId: intent.id,
      })
      .where(eq(subscription.userId, userId));

    await createBillingAlert(
      userId,
      "payment_success",
      `Payment of $${(amountCents / 100).toFixed(2)} processed for ${agentCount} agent${agentCount > 1 ? "s" : ""}. Next billing in 30 days.`,
    );

    logger.info({ userId, amountCents, tier, agentCount }, "Billing charge succeeded");
    return { success: true, amountCents, paymentIntentId: intent.id };

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ userId, err }, "Billing charge failed");

    // Check if this is a second failure → suspend
    const [sub] = await db
      .select()
      .from(subscription)
      .where(eq(subscription.userId, userId));

    const newStatus = sub?.status === "past_due" ? "suspended" : "past_due";

    await db
      .update(subscription)
      .set({ status: newStatus })
      .where(eq(subscription.userId, userId));

    await createBillingAlert(
      userId,
      "payment_failed",
      newStatus === "suspended"
        ? "Your payment failed again. All agents have been suspended. Please update your payment method to resume."
        : "Your payment failed. Please update your payment method. Agents will be suspended if not resolved.",
    );

    return { success: false, amountCents, error: message };
  }
}

// ── Alert helpers ─────────────────────────────────────────────────────────

export async function createBillingAlert(
  userId: string,
  type: BillingAlertType,
  message: string,
): Promise<void> {
  await db.insert(billingAlert).values({ userId, type, message });
}

export async function getUnreadAlerts(userId: string) {
  return db
    .select()
    .from(billingAlert)
    .where(and(eq(billingAlert.userId, userId), eq(billingAlert.isRead, false)))
    .orderBy(billingAlert.createdAt);
}

export async function getAllAlerts(userId: string) {
  return db
    .select()
    .from(billingAlert)
    .where(eq(billingAlert.userId, userId))
    .orderBy(billingAlert.createdAt);
}

export async function markAlertRead(alertId: string, userId: string): Promise<void> {
  await db
    .update(billingAlert)
    .set({ isRead: true })
    .where(and(eq(billingAlert.id, alertId), eq(billingAlert.userId, userId)));
}

export async function markAllAlertsRead(userId: string): Promise<void> {
  await db
    .update(billingAlert)
    .set({ isRead: true })
    .where(eq(billingAlert.userId, userId));
}

// ── Utility ───────────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Quick summary object for the billing dashboard. */
export async function getBillingDashboardData(userId: string) {
  const [sub] = await db
    .select()
    .from(subscription)
    .where(eq(subscription.userId, userId));

  const trial = await getTrialStatus(userId);
  const agentCount = await getActiveAgentCount(userId);
  const { tier, pricePerAgent } = calculateTier(agentCount);
  const monthlyTotal = agentCount * pricePerAgent;
  const hasCard = await hasPaymentMethod(userId);
  const alerts = await getUnreadAlerts(userId);

  return {
    status: sub?.status ?? "trial",
    tier,
    pricePerAgent,
    agentCount,
    monthlyTotal,
    hasCard,
    nextBilledAt: sub?.nextBilledAt ?? null,
    lastBilledAt: sub?.lastBilledAt ?? null,
    trial,
    alerts,
  };
}
