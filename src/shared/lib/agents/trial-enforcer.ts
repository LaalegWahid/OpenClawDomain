import { and, eq, like, lt } from "drizzle-orm";
import { db } from "../drizzle";
import { agent } from "../../db/schema/agent";
import { agentSubscription } from "../../db/schema/subscription";
import { stopContainer } from "./docker";
import { logger } from "../logger";

async function killOne(agentId: string, stripeSubscriptionId: string) {
  const [ag] = await db
    .select({ containerId: agent.containerId })
    .from(agent)
    .where(eq(agent.id, agentId));

  if (ag?.containerId) {
    await stopContainer(ag.containerId).catch((err) => {
      logger.warn({ err, agentId }, "Trial kill: stopContainer failed");
    });
  }

  await db
    .update(agent)
    .set({ status: "stopped", containerId: null })
    .where(eq(agent.id, agentId));

  await db
    .update(agentSubscription)
    .set({ status: "canceled", canceledAt: new Date(), cancelAtPeriodEnd: false })
    .where(eq(agentSubscription.stripeSubscriptionId, stripeSubscriptionId));

  logger.info({ agentId }, "Trial expired — agent stopped");
}

/**
 * Sweep a user's agents for expired free trials. Called from the dashboard
 * GET so a kill happens the moment the user (or any auth'd reader) touches
 * the system — no cron required.
 */
export async function enforceUserTrialKills(userId: string): Promise<number> {
  const expired = await db
    .select({
      agentId: agentSubscription.agentId,
      stripeSubscriptionId: agentSubscription.stripeSubscriptionId,
    })
    .from(agentSubscription)
    .where(
      and(
        eq(agentSubscription.userId, userId),
        eq(agentSubscription.status, "active"),
        like(agentSubscription.stripeSubscriptionId, "free_trial_%"),
        lt(agentSubscription.currentPeriodEnd, new Date()),
      ),
    );

  let killed = 0;
  for (const row of expired) {
    if (!row.agentId || !row.stripeSubscriptionId) continue;
    try {
      await killOne(row.agentId, row.stripeSubscriptionId);
      killed++;
    } catch (err) {
      logger.error({ err, agentId: row.agentId }, "Trial kill failed");
    }
  }
  return killed;
}

/**
 * Check one agent for trial expiry. Returns true if it just got killed.
 * Called from inbound message handlers so the next message to an expired
 * agent triggers the kill, and the standard "agent has been stopped" reply
 * goes out from the existing status check.
 */
export async function enforceAgentTrialKill(agentId: string): Promise<boolean> {
  const [row] = await db
    .select({
      stripeSubscriptionId: agentSubscription.stripeSubscriptionId,
      currentPeriodEnd: agentSubscription.currentPeriodEnd,
      status: agentSubscription.status,
    })
    .from(agentSubscription)
    .where(eq(agentSubscription.agentId, agentId));

  if (!row?.stripeSubscriptionId) return false;
  if (row.status !== "active") return false;
  if (!row.stripeSubscriptionId.startsWith("free_trial_")) return false;
  if (!(row.currentPeriodEnd instanceof Date)) return false;
  if (row.currentPeriodEnd >= new Date()) return false;

  try {
    await killOne(agentId, row.stripeSubscriptionId);
    return true;
  } catch (err) {
    logger.error({ err, agentId }, "Trial kill failed");
    return false;
  }
}
