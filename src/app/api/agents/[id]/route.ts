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
    return NextResponse.json({ error: "Unhandled error in GET /api/agents/[id]. Check server logs." }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionOrThrow(req);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { profileImage } = body as { profileImage?: string | null };

    if (typeof profileImage !== "string" && profileImage !== null) {
      return NextResponse.json({ error: "profileImage must be a string or null" }, { status: 400 });
    }

    if (typeof profileImage === "string") {
      if (!profileImage.startsWith("data:image/")) {
        return NextResponse.json({ error: "profileImage must be a data:image/... URI" }, { status: 400 });
      }
      if (profileImage.length > 700_000) {
        return NextResponse.json({ error: "Image too large (max ~500KB after encoding)" }, { status: 413 });
      }
    }

    const [found] = await db
      .select()
      .from(agent)
      .where(and(eq(agent.id, id), eq(agent.userId, session.user.id)));

    if (!found) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const [updated] = await db
      .update(agent)
      .set({ profileImage: profileImage ?? null })
      .where(eq(agent.id, id))
      .returning();

    return NextResponse.json({ agent: updated });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to update agent");
    return NextResponse.json({ error: "Unhandled error in PATCH /api/agents/[id]" }, { status: 500 });
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

    await db.delete(agent).where(eq(agent.id, id));

    logger.info({ agentId: id, userId: session.user.id }, "Agent deleted");
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to stop agent");
    return NextResponse.json({ error: "Unhandled error in DELETE /api/agents/[id]. Check server logs." }, { status: 500 });
  }
}
