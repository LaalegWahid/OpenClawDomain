/**
 * GET /api/cron/billing
 *
 * Daily billing cron — call this once every 24 hours via an external scheduler
 * (AWS EventBridge, Vercel Cron, etc.) with header: Authorization: Bearer <CRON_SECRET>
 *
 * What it does each run:
 *  1. Trial reminder (days 10–14): create in-app alert if not already sent today.
 *  2. Trial expiry (day 15+, no card): stop the agent + mark subscription suspended.
 *  3. Card-missing check for non-trial active users: create card_missing alert.
 *  4. 30-day billing cycle: charge users whose nextBilledAt is today or overdue.
 *  5. Suspended users with card: attempt recovery charge.
 */

import { NextResponse } from "next/server";
import { eq, lte, inArray, and, isNotNull, ne } from "drizzle-orm";
import { db } from "../../../../shared/lib/drizzle";
import { user } from "../../../../shared/db/schema/auth";
import { agent } from "../../../../shared/db/schema/agent";
import { subscription } from "../../../../shared/db/schema/subscription";
import { billingAlert } from "../../../../shared/db/schema/billing";
import { stopContainer } from "../../../../shared/lib/agents/docker";
import {
  getTrialStatus,
  markTrialUsed,
  hasPaymentMethod,
  chargeUser,
  createBillingAlert,
  syncSubscriptionTier,
} from "../../../../shared/lib/billing/billing.service";
import { logger } from "../../../../shared/lib/logger";
import { env } from "../../../../shared/config/env";

export async function GET(req: Request) {
  // Auth check — same pattern as sync-agents
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    trialReminders: 0,
    trialExpired: 0,
    cardMissingWarnings: 0,
    charged: 0,
    chargeFailed: 0,
    suspendedRecovered: 0,
  };

  const now = new Date();

  // ── 1 & 2: Trial checks ────────────────────────────────────────────────────
  // Find all users currently in trial (trialStartedAt set, trialUsed = false)
  const trialUsers = await db
    .select({ id: user.id, trialEndsAt: user.trialEndsAt })
    .from(user)
    .where(
      and(
        isNotNull(user.trialStartedAt),
        eq(user.trialUsed, false),
      ),
    );

  for (const u of trialUsers) {
    const trial = await getTrialStatus(u.id);

    if (trial.isExpired) {
      // Day 15+ — check if they added a card
      const hasCard = await hasPaymentMethod(u.id);

      if (!hasCard) {
        // No card → stop all their agents and suspend
        const userAgents = await db
          .select({ id: agent.id, containerId: agent.containerId })
          .from(agent)
          .where(eq(agent.userId, u.id));

        for (const ag of userAgents) {
          if (ag.containerId) {
            await stopContainer(ag.containerId).catch(() => {});
          }
          await db.update(agent).set({ status: "stopped" }).where(eq(agent.id, ag.id));
        }

        // Mark trial used + subscription suspended
        await markTrialUsed(u.id);
        await db
          .update(subscription)
          .set({ status: "suspended" })
          .where(eq(subscription.userId, u.id));

        await createBillingAlert(
          u.id,
          "trial_expired",
          "Your 15-day free trial has ended. Add a payment card to reactivate your agents.",
        );

        logger.info({ userId: u.id }, "Trial expired — agents suspended");
        results.trialExpired++;

      } else {
        // They added a card before day 15 — activate them and charge for first cycle
        await markTrialUsed(u.id);
        await syncSubscriptionTier(u.id);
        await db
          .update(subscription)
          .set({ status: "active" })
          .where(eq(subscription.userId, u.id));

        // Schedule first billing cycle from today
        const nextBilledAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        await db
          .update(subscription)
          .set({ lastBilledAt: now, nextBilledAt })
          .where(eq(subscription.userId, u.id));

        logger.info({ userId: u.id }, "Trial ended with card — activated");
      }

    } else if (trial.needsReminder) {
      // Days 10–14 — check if we already sent a reminder today
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      const [todaysReminder] = await db
        .select({ id: billingAlert.id })
        .from(billingAlert)
        .where(
          and(
            eq(billingAlert.userId, u.id),
            eq(billingAlert.type, "trial_reminder"),
            lte(billingAlert.createdAt, now), // created before now
          ),
        )
        .limit(1);

      // Only create one reminder per day — check if one was made today
      const alreadySentToday = todaysReminder
        ? todaysReminder !== null && await wasSentToday(u.id, "trial_reminder", startOfDay)
        : false;

      if (!alreadySentToday) {
        const daysLeft = trial.daysRemaining;
        await createBillingAlert(
          u.id,
          "trial_reminder",
          `Your free trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Add a payment card to keep your agents running.`,
        );
        results.trialReminders++;
      }
    }
  }

  // ── 3: Card-missing check for active (non-trial) users ────────────────────
  const activeNonTrialSubs = await db
    .select({ userId: subscription.userId })
    .from(subscription)
    .where(
      and(
        eq(subscription.status, "active"),
        isNotNull(subscription.lastBilledAt), // has been billed before = not trial
      ),
    );

  for (const sub of activeNonTrialSubs) {
    const hasCard = await hasPaymentMethod(sub.userId);
    if (!hasCard) {
      // Only warn once per day
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const alreadyWarned = await wasSentToday(sub.userId, "card_missing", startOfDay);
      if (!alreadyWarned) {
        await createBillingAlert(
          sub.userId,
          "card_missing",
          "No payment method found. Add a card to avoid service interruption.",
        );
        results.cardMissingWarnings++;
      }
    }
  }

  // ── 4: 30-day billing cycle ────────────────────────────────────────────────
  // Charge users whose nextBilledAt is today or overdue
  const dueForBilling = await db
    .select({ userId: subscription.userId })
    .from(subscription)
    .where(
      and(
        eq(subscription.status, "active"),
        isNotNull(subscription.nextBilledAt),
        lte(subscription.nextBilledAt, now),
      ),
    );

  for (const sub of dueForBilling) {
    const result = await chargeUser(sub.userId);
    if (result.success) {
      results.charged++;
      logger.info({ userId: sub.userId, amountCents: result.amountCents }, "Monthly charge succeeded");
    } else {
      results.chargeFailed++;
      logger.warn({ userId: sub.userId, error: result.error }, "Monthly charge failed");
    }
  }

  // ── 5: Suspended users who now have a card → attempt recovery ─────────────
  const suspendedSubs = await db
    .select({ userId: subscription.userId })
    .from(subscription)
    .where(eq(subscription.status, "suspended"));

  for (const sub of suspendedSubs) {
    const hasCard = await hasPaymentMethod(sub.userId);
    if (hasCard) {
      const result = await chargeUser(sub.userId);
      if (result.success) {
        // Unsuspend — restart agents
        const stoppedAgents = await db
          .select({ id: agent.id })
          .from(agent)
          .where(and(eq(agent.userId, sub.userId), eq(agent.status, "stopped")));

        // Mark them as "starting" — the sync-agents cron will relaunch containers
        if (stoppedAgents.length > 0) {
          await db
            .update(agent)
            .set({ status: "starting" })
            .where(
              inArray(agent.id, stoppedAgents.map((a) => a.id)),
            );
        }

        await db
          .update(subscription)
          .set({ status: "active" })
          .where(eq(subscription.userId, sub.userId));

        results.suspendedRecovered++;
        logger.info({ userId: sub.userId }, "Suspended user recovered after card added");
      }
    }
  }

  logger.info(results, "Billing cron completed");
  return NextResponse.json({ ok: true, ...results });
}

// ── Helper: was a given alert type already sent today? ────────────────────
async function wasSentToday(
  userId: string,
  type: string,
  startOfDay: Date,
): Promise<boolean> {
  const [row] = await db
    .select({ id: billingAlert.id })
    .from(billingAlert)
    .where(
      and(
        eq(billingAlert.userId, userId),
        eq(billingAlert.type, type as never),
lte(billingAlert.createdAt, startOfDay),      ),
    )
    .limit(1);
  return !!row;
}
