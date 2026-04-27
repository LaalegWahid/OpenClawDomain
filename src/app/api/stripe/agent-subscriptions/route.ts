import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../shared/lib/auth/getSessionOrThrow";
import { getAgentSubscriptionsForUser } from "../../../../shared/lib/stripe/stripe.service";
import { db } from "../../../../shared/lib/drizzle";
import { agent } from "../../../../shared/db/schema/agent";
import { eq } from "drizzle-orm";
import { logger } from "../../../../shared/lib/logger";

export async function GET(req: Request) {
  try {
    const session = await getSessionOrThrow(req);
    const subs = await getAgentSubscriptionsForUser(session.user.id);

    const agentIds = subs.map((s) => s.agentId).filter((id): id is string => !!id);
    const agents = agentIds.length
      ? await db.select({ id: agent.id, name: agent.name }).from(agent).where(eq(agent.userId, session.user.id))
      : [];
    const agentNameById = new Map(agents.map((a) => [a.id, a.name]));

    const enriched = subs.map((s) => ({
      id: s.id,
      agentId: s.agentId,
      agentName: s.agentId ? (agentNameById.get(s.agentId) ?? null) : null,
      status: s.status,
      currentPeriodEnd: s.currentPeriodEnd,
      cancelAtPeriodEnd: s.cancelAtPeriodEnd,
      canceledAt: s.canceledAt,
      stripeSubscriptionId: s.stripeSubscriptionId,
      createdAt: s.createdAt,
    }));

    return NextResponse.json({ subscriptions: enriched });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "GET /api/stripe/agent-subscriptions failed");
    return NextResponse.json(
      { error: "Failed to load agent subscriptions." },
      { status: 500 },
    );
  }
}
