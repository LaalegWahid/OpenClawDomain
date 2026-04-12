/**
 * DELETE /api/user/delete
 *
 * Permanently deletes the authenticated user's account:
 *  1. Stops all agent containers
 *  2. Detaches all Stripe payment methods & removes Stripe customer
 *  3. Cancels any active Stripe subscription (legacy rows)
 *  4. Hard-deletes the user row (cascade removes agents, subscription, alerts, etc.)
 *
 * Requires the user to confirm by sending { confirm: true } in the request body.
 */

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSessionOrThrow } from "../../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../../shared/lib/drizzle";
import { agent } from "../../../../shared/db/schema/agent";
import { paymentMethod, subscription } from "../../../../shared/db/schema/subscription";
import { userProfile, user } from "../../../../shared/db/schema/auth";
import { stopContainer } from "../../../../shared/lib/agents/docker";
import { deleteWebhook } from "../../../../shared/lib/telegram/bot";
import { stripe } from "../../../../shared/lib/stripe";
import { logger } from "../../../../shared/lib/logger";

export async function DELETE(req: Request) {
  try {
    const session = await getSessionOrThrow(req);
    const userId = session.user.id;

    const body = await req.json().catch(() => ({}));
    if (!body.confirm) {
      return NextResponse.json(
        { error: "Send { confirm: true } to confirm account deletion." },
        { status: 400 },
      );
    }

    // ── 1. Stop all agent containers ───────────────────────────────────────
    const userAgents = await db
      .select({ id: agent.id, containerId: agent.containerId, botToken: agent.botToken })
      .from(agent)
      .where(eq(agent.userId, userId));

    for (const ag of userAgents) {
      if (ag.containerId) {
        await stopContainer(ag.containerId).catch((err) =>
          logger.warn({ agentId: ag.id, err }, "Failed to stop container during account deletion"),
        );
      }
      await deleteWebhook(ag.botToken).catch(() => {});
    }

    // ── 2. Cancel Stripe subscription (legacy) + detach payment methods ────
    const [profile] = await db
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, userId));

    if (profile?.stripeCustomerId) {
      // Cancel any active Stripe subscriptions
      const [sub] = await db
        .select()
        .from(subscription)
        .where(eq(subscription.userId, userId));

      if (sub?.stripeSubscriptionId) {
        await stripe.subscriptions
          .cancel(sub.stripeSubscriptionId)
          .catch((err) => logger.warn({ err }, "Failed to cancel Stripe subscription"));
      }

      // Detach all saved payment methods from Stripe customer
      const savedMethods = await db
        .select()
        .from(paymentMethod)
        .where(eq(paymentMethod.userId, userId));

      for (const pm of savedMethods) {
        await stripe.paymentMethods
          .detach(pm.stripePaymentMethodId)
          .catch((err) => logger.warn({ pmId: pm.stripePaymentMethodId, err }, "Failed to detach PM"));
      }

      // Delete the Stripe customer record entirely
      await stripe.customers
        .del(profile.stripeCustomerId)
        .catch((err) => logger.warn({ err }, "Failed to delete Stripe customer"));
    }

    // ── 3. Hard-delete user (all related rows cascade via FK) ──────────────
    // Cascade deletes: agent, agentActivity, chatSession, agentChannel, agentMcp,
    //                  agentLog, skill, agentSkill, subscription, paymentMethod,
    //                  billingAlert, session, account, userProfile, apikey, sdkToken
    await db.delete(user).where(eq(user.id, userId));

    logger.info({ userId }, "Account deleted");

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to delete account");
    return NextResponse.json({ error: "Failed to delete account. Please contact support." }, { status: 500 });
  }
}
