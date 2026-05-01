import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSessionOrThrow } from "../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../shared/lib/drizzle";
import { agent } from "../../../shared/db/schema/agent";
import { user } from "../../../shared/db/schema/auth";
import { stopContainer } from "../../../shared/lib/agents/docker";
import { deleteWebhook } from "../../../shared/lib/telegram/bot";
import { deleteStripeCustomerForUser } from "../../../shared/lib/stripe/stripe.service";
import { logger } from "../../../shared/lib/logger";

/**
 * Permanently delete the authenticated user and everything attached to them:
 *  • stop every running agent container (ECS)
 *  • drop all Telegram webhooks so the bot tokens stop pinging us
 *  • delete the Stripe customer (cancels every sub + detaches every PM)
 *  • delete the user row → DB cascades wipe agents, sessions, accounts,
 *    payment methods, subscriptions, skills, referrals, feedback, etc.
 *
 * Each external step is best-effort: if a container won't stop or Stripe is
 * down, we log and continue so a transient outage doesn't permanently strand
 * a user mid-deletion.
 */
export async function DELETE(req: Request) {
  try {
    const session = await getSessionOrThrow(req);
    const userId = session.user.id;

    // 1. Stop every container and tear down its Telegram webhook (if any).
    const userAgents = await db
      .select({ id: agent.id, containerId: agent.containerId, botToken: agent.botToken })
      .from(agent)
      .where(eq(agent.userId, userId));

    for (const ag of userAgents) {
      if (ag.containerId) {
        await stopContainer(ag.containerId).catch((err) => {
          logger.warn({ err, agentId: ag.id }, "Account delete: stopContainer failed");
        });
      }
      if (ag.botToken) {
        await deleteWebhook(ag.botToken).catch((err) => {
          logger.warn({ err, agentId: ag.id }, "Account delete: deleteWebhook failed");
        });
      }
    }

    // 2. Wipe Stripe — cancels subs + detaches payment methods + removes customer.
    await deleteStripeCustomerForUser(userId).catch((err) => {
      logger.warn({ err, userId }, "Account delete: Stripe wipe failed");
    });

    // 3. Delete the user row. FK cascades handle sessions, accounts, agents,
    //    chat sessions, agent activities, agent logs, channels, MCP configs,
    //    skills, referrals, payment methods, subscriptions, feedback, etc.
    await db.delete(user).where(eq(user.id, userId));

    logger.info({ userId, agentCount: userAgents.length }, "Account deleted");
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Account deletion failed");
    return NextResponse.json(
      { error: "Account deletion failed. Some external resources may still need cleanup — please contact support." },
      { status: 500 },
    );
  }
}
