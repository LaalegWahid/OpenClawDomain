import { NextResponse } from "next/server";
import { eq, inArray, and } from "drizzle-orm";
import { getSessionOrThrow } from "../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../shared/lib/drizzle";
import { agent, agentChannel } from "../../../shared/db/schema/agent";
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

    // Collect Telegram tokens from agentChannel for any of this user's agents.
    const agentIds = userAgents.map((a) => a.id);
    const tgChannels = agentIds.length
      ? await db
          .select({ agentId: agentChannel.agentId, credentials: agentChannel.credentials })
          .from(agentChannel)
          .where(and(inArray(agentChannel.agentId, agentIds), eq(agentChannel.platform, "telegram")))
      : [];
    const tokensByAgent = new Map<string, Set<string>>();
    for (const ag of userAgents) {
      const set = new Set<string>();
      if (ag.botToken) set.add(ag.botToken);
      tokensByAgent.set(ag.id, set);
    }
    for (const ch of tgChannels) {
      const t = (ch.credentials as { botToken?: string } | undefined)?.botToken;
      if (t) tokensByAgent.get(ch.agentId)?.add(t);
    }

    for (const ag of userAgents) {
      if (ag.containerId) {
        await stopContainer(ag.containerId).catch((err) => {
          logger.warn({ err, agentId: ag.id }, "Account delete: stopContainer failed");
        });
      }
      for (const token of tokensByAgent.get(ag.id) ?? []) {
        await deleteWebhook(token).catch((err) => {
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
