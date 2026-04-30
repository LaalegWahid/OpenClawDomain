import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "../../../../../../shared/lib/drizzle";
import { agent, agentTask } from "../../../../../../shared/db/schema/agent";
import { logger } from "../../../../../../shared/lib/logger";

const MAX_TASKS_PER_AGENT = 20;

function verifyGatewayToken(req: Request): boolean {
  const expected = process.env.GATEWAY_TOKEN;
  if (!expected) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${expected}`;
}

function looksLikeCron(expr: string): boolean {
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 5 || parts.length > 6) return false;
  return parts.every((p) => /^[\d*/,\-?LW#]+$/i.test(p));
}

/**
 * Agent-facing endpoint. Called from inside the container by the model when a
 * user asks "schedule X". Authenticated with the same GATEWAY_TOKEN that the
 * config endpoint uses. Writes to the same agent_task table the UI reads, so
 * chat-created tasks survive container relaunches.
 *
 * Idempotent on (agentId, name): a duplicate POST returns 200 with the
 * existing task instead of 409, so the agent can safely retry.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!verifyGatewayToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: agentId } = await params;

    const [agentRecord] = await db
      .select({ userId: agent.userId })
      .from(agent)
      .where(eq(agent.id, agentId))
      .limit(1);
    if (!agentRecord) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

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

    const [duplicate] = await db
      .select()
      .from(agentTask)
      .where(and(eq(agentTask.agentId, agentId), eq(agentTask.name, name)))
      .limit(1);
    if (duplicate) {
      logger.info({ agentId, taskId: duplicate.id, name }, "Agent task POST is idempotent (existing name)");
      return NextResponse.json({ task: duplicate }, { status: 200 });
    }

    const existing = await db
      .select({ id: agentTask.id })
      .from(agentTask)
      .where(eq(agentTask.agentId, agentId));
    if (existing.length >= MAX_TASKS_PER_AGENT) {
      return NextResponse.json(
        { error: `Maximum ${MAX_TASKS_PER_AGENT} tasks per agent` },
        { status: 429 },
      );
    }

    const [created] = await db
      .insert(agentTask)
      .values({
        agentId,
        userId: agentRecord.userId,
        name,
        prompt,
        cronExpr,
        timezone,
        sessionMode,
      })
      .returning();

    logger.info({ agentId, taskId: created.id, cronExpr, source: "chat" }, "Agent task created via chat");
    return NextResponse.json({ task: created }, { status: 201 });
  } catch (err) {
    logger.error({ err }, "Internal task create failed");
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
