import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { getSessionOrThrow } from "../../../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../../../shared/lib/drizzle";
import { agent, agentTask } from "../../../../../shared/db/schema/agent";
import { logger } from "../../../../../shared/lib/logger";
import { relaunchAgentWithChannels } from "../../../../../shared/lib/agents/relaunch";

const MAX_TASKS_PER_AGENT = 20;

async function getOwnedAgent(req: Request, agentId: string) {
  const session = await getSessionOrThrow(req);
  const [found] = await db
    .select()
    .from(agent)
    .where(and(eq(agent.id, agentId), eq(agent.userId, session.user.id)));
  return { found: found ?? null, userId: session.user.id };
}

/**
 * Light validation — we accept what `croner` (OpenClaw's parser) accepts.
 * 5 or 6 space-separated fields of digits / wildcards / ranges / lists / steps.
 * OpenClaw is the authoritative validator; this just catches obvious garbage
 * before we write a row that would silently fail at container start.
 */
function looksLikeCron(expr: string): boolean {
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 5 || parts.length > 6) return false;
  return parts.every((p) => /^[\d*/,\-?LW#]+$/i.test(p));
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { found } = await getOwnedAgent(req, id);
    if (!found) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const tasks = await db
      .select({
        id: agentTask.id,
        name: agentTask.name,
        prompt: agentTask.prompt,
        cronExpr: agentTask.cronExpr,
        timezone: agentTask.timezone,
        sessionMode: agentTask.sessionMode,
        enabled: agentTask.enabled,
        createdAt: agentTask.createdAt,
        updatedAt: agentTask.updatedAt,
      })
      .from(agentTask)
      .where(eq(agentTask.agentId, id))
      .orderBy(desc(agentTask.createdAt));

    return NextResponse.json({ tasks });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to list agent tasks");
    return NextResponse.json({ error: "Failed to list tasks" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { found, userId } = await getOwnedAgent(req, id);
    if (!found) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const body = await req.json();
    const name = (body.name as string | undefined)?.trim();
    const prompt = (body.prompt as string | undefined)?.trim();
    const cronExpr = (body.cronExpr as string | undefined)?.trim();
    const timezone = (body.timezone as string | undefined)?.trim() || "UTC";
    const sessionMode = (body.sessionMode as string | undefined)?.trim() || "isolated";

    if (!name || name.length > 80) {
      return NextResponse.json({ error: "name is required (max 80 chars)" }, { status: 400 });
    }
    if (!prompt || prompt.length > 4000) {
      return NextResponse.json({ error: "prompt is required (max 4000 chars)" }, { status: 400 });
    }
    if (!cronExpr || !looksLikeCron(cronExpr)) {
      return NextResponse.json({ error: "cronExpr must be a valid 5- or 6-field cron expression" }, { status: 400 });
    }
    if (sessionMode !== "isolated" && sessionMode !== "main") {
      return NextResponse.json({ error: "sessionMode must be 'isolated' or 'main'" }, { status: 400 });
    }

    const existing = await db
      .select({ id: agentTask.id })
      .from(agentTask)
      .where(eq(agentTask.agentId, id));
    if (existing.length >= MAX_TASKS_PER_AGENT) {
      return NextResponse.json(
        { error: `Maximum ${MAX_TASKS_PER_AGENT} tasks per agent` },
        { status: 429 },
      );
    }

    const [created] = await db
      .insert(agentTask)
      .values({ agentId: id, userId, name, prompt, cronExpr, timezone, sessionMode })
      .returning();

    void relaunchAgentWithChannels(id).catch((err) =>
      logger.error({ err, agentId: id }, "Failed to relaunch agent after task add"),
    );
    logger.info({ agentId: id, taskId: created.id, cronExpr }, "Agent task created");
    return NextResponse.json({ task: created }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to create agent task");
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
