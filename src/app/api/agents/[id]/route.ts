import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../../shared/lib/drizzle";
import { agent, agentActivity } from "../../../../shared/db/schema/agent";
import { eq, and, desc } from "drizzle-orm";
import { stopContainer } from "../../../../shared/lib/agents/docker";
import { deleteWebhook } from "../../../../shared/lib/telegram/bot";
import { logger } from "../../../../shared/lib/logger";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionOrThrow(req);
    const { id } = await params;

    const [found] = await db
      .select()
      .from(agent)
      .where(and(eq(agent.id, id), eq(agent.userId, session.user.id)));

    if (!found) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const activities = await db
      .select()
      .from(agentActivity)
      .where(eq(agentActivity.agentId, id))
      .orderBy(desc(agentActivity.createdAt))
      .limit(20);

    logger.info({ agentId: id }, "Agent fetched");
    return NextResponse.json({ agent: found, activities });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionOrThrow(req);
    const { id } = await params;

    const [found] = await db
      .select()
      .from(agent)
      .where(and(eq(agent.id, id), eq(agent.userId, session.user.id)));

    if (!found) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (found.containerId) {
      await stopContainer(found.containerId);
    }

    // Remove webhook from Telegram
    try {
      await deleteWebhook(found.botToken);
    } catch (err) {
      logger.warn({ agentId: id, err }, "Failed to delete webhook");
    }

    await db
      .update(agent)
      .set({ status: "stopped", containerId: null })
      .where(eq(agent.id, id));

    await db.insert(agentActivity).values({
      agentId: id,
      type: "stop",
      message: "Agent stopped by user",
    });

    logger.info({ agentId: id, userId: session.user.id }, "Agent stopped");
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to stop agent");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
