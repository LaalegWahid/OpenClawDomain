import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../../shared/lib/drizzle";
import { agent, agentActivity } from "../../../../shared/db/schema/agent";
import { eq, and, desc } from "drizzle-orm";
import { stopContainer } from "../../../../shared/lib/agents/docker";
import { deleteWebhook } from "../../../../shared/lib/telegram/bot";
import { logger } from "../../../../shared/lib/logger";
import { encryptIfPresent } from "../../../../shared/lib/crypto";

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
    const { apiKey: _encApiKey, ...safeAgent } = found;
    return NextResponse.json({
      agent: { ...safeAgent, hasApiKey: !!_encApiKey },
      activities,
    });
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
    const { profileImage, apiProvider, apiKey, agentModel } = body as {
      profileImage?: string | null;
      apiProvider?: string | null;
      apiKey?: string | null;
      agentModel?: string | null;
    };

    const updates: Partial<typeof agent.$inferInsert> = {};

    if (profileImage !== undefined) {
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
      updates.profileImage = profileImage ?? null;
    }

    if (apiProvider !== undefined) {
      updates.apiProvider = typeof apiProvider === "string" && apiProvider.trim()
        ? apiProvider.trim().toLowerCase()
        : null;
    }

    if (agentModel !== undefined) {
      updates.agentModel = typeof agentModel === "string" && agentModel.trim()
        ? agentModel.trim()
        : null;
    }

    if (apiKey !== undefined) {
      if (apiKey === null || apiKey === "") {
        updates.apiKey = null;
      } else if (typeof apiKey === "string") {
        updates.apiKey = encryptIfPresent(apiKey);
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
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
      .set(updates)
      .where(eq(agent.id, id))
      .returning();

    const { apiKey: _enc, ...safe } = updated;
    return NextResponse.json({ agent: { ...safe, hasApiKey: !!_enc } });
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
