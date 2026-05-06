import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getSessionOrThrow } from "../../../../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../../../../shared/lib/drizzle";
import { agent, agentTask } from "../../../../../../shared/db/schema/agent";
import { logger } from "../../../../../../shared/lib/logger";
import { relaunchAgentWithChannels } from "../../../../../../shared/lib/agents/relaunch";

function looksLikeCron(expr: string): boolean {
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 5 || parts.length > 6) return false;
  return parts.every((p) => /^[\d*/,\-?LW#]+$/i.test(p));
}

async function getOwnedTask(req: Request, agentId: string, taskId: string) {
  const session = await getSessionOrThrow(req);
  const [a] = await db
    .select({ id: agent.id })
    .from(agent)
    .where(and(eq(agent.id, agentId), eq(agent.userId, session.user.id)));
  if (!a) return null;
  const [t] = await db
    .select()
    .from(agentTask)
    .where(and(eq(agentTask.id, taskId), eq(agentTask.agentId, agentId)));
  return t ?? null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  try {
    const { id, taskId } = await params;
    const existing = await getOwnedTask(req, id, taskId);
    if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const body = await req.json();
    const updates: Partial<typeof agentTask.$inferInsert> = {};

    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name || name.length > 80) {
        return NextResponse.json({ error: "name must be 1–80 chars" }, { status: 400 });
      }
      updates.name = name;
    }
    if (typeof body.prompt === "string") {
      const prompt = body.prompt.trim();
      if (!prompt || prompt.length > 4000) {
        return NextResponse.json({ error: "prompt must be 1–4000 chars" }, { status: 400 });
      }
      updates.prompt = prompt;
    }
    if (typeof body.cronExpr === "string") {
      const cronExpr = body.cronExpr.trim();
      if (!looksLikeCron(cronExpr)) {
        return NextResponse.json({ error: "Invalid cron expression" }, { status: 400 });
      }
      updates.cronExpr = cronExpr;
    }
    if (typeof body.timezone === "string") {
      updates.timezone = body.timezone.trim() || "UTC";
    }
    if (typeof body.sessionMode === "string") {
      if (body.sessionMode !== "isolated" && body.sessionMode !== "main") {
        return NextResponse.json({ error: "sessionMode must be 'isolated' or 'main'" }, { status: 400 });
      }
      updates.sessionMode = body.sessionMode;
    }
    if (typeof body.enabled === "boolean") {
      updates.enabled = body.enabled;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ task: existing });
    }

    const [updated] = await db
      .update(agentTask)
      .set(updates)
      .where(eq(agentTask.id, taskId))
      .returning();

    void relaunchAgentWithChannels(id).catch((err) =>
      logger.error({ err, agentId: id }, "Failed to relaunch agent after task update"),
    );
    logger.info({ agentId: id, taskId, fields: Object.keys(updates) }, "Agent task updated");
    return NextResponse.json({ task: updated });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to update agent task");
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  try {
    const { id, taskId } = await params;
    const existing = await getOwnedTask(req, id, taskId);
    if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    await db.delete(agentTask).where(eq(agentTask.id, taskId));

    void relaunchAgentWithChannels(id).catch((err) =>
      logger.error({ err, agentId: id }, "Failed to relaunch agent after task delete"),
    );
    logger.info({ agentId: id, taskId }, "Agent task deleted");
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to delete agent task");
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
