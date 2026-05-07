import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "../../../../../shared/lib/drizzle";
import { agent } from "../../../../../shared/db/schema/agent";
import { getSessionOrThrow } from "../../../../../shared/lib/auth/getSessionOrThrow";
import { sendCommand } from "../../../../../shared/lib/agents/docker";
import { logger } from "../../../../../shared/lib/logger";
import type { AgentType } from "../../../../../shared/lib/agents/config";

const MAX_QUESTION_LEN = 4000;

/**
 * Drives the inter-agent test from the dashboard. Sends a wrapper prompt to the
 * "from" agent that instructs it to call the peer-ask endpoint against the
 * "to" agent and report what came back. This exercises the full end-to-end
 * path: bash tool → /api/internal/.../ask → target gateway → reply.
 *
 * URL param `id`: the FROM agent (the one we send the wrapper prompt to).
 * Body: { toAgentId: uuid, question: string }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionOrThrow(req);
    const { id: fromAgentId } = await params;
    const body = await req.json().catch(() => ({}));
    const toAgentId = (body.toAgentId as string | undefined)?.trim();
    const question = (body.question as string | undefined)?.trim();

    if (!toAgentId) {
      return NextResponse.json({ error: "toAgentId is required" }, { status: 400 });
    }
    if (!question) {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }
    if (question.length > MAX_QUESTION_LEN) {
      return NextResponse.json(
        { error: `question too long (max ${MAX_QUESTION_LEN} chars)` },
        { status: 400 },
      );
    }
    if (fromAgentId === toAgentId) {
      return NextResponse.json({ error: "from and to agents must differ" }, { status: 400 });
    }

    const [fromAgent] = await db
      .select()
      .from(agent)
      .where(and(eq(agent.id, fromAgentId), eq(agent.userId, session.user.id)))
      .limit(1);
    if (!fromAgent) {
      return NextResponse.json({ error: "from agent not found" }, { status: 404 });
    }

    const [toAgent] = await db
      .select()
      .from(agent)
      .where(and(eq(agent.id, toAgentId), eq(agent.userId, session.user.id)))
      .limit(1);
    if (!toAgent) {
      return NextResponse.json({ error: "to agent not found" }, { status: 404 });
    }

    if (fromAgent.status !== "active" || !fromAgent.containerId) {
      return NextResponse.json(
        { error: `from agent is ${fromAgent.status}, must be active` },
        { status: 409 },
      );
    }
    if (toAgent.status !== "active" || !toAgent.containerId) {
      return NextResponse.json(
        { error: `to agent is ${toAgent.status}, must be active` },
        { status: 409 },
      );
    }

    const wrapperPrompt = [
      `You have a peer agent available to consult.`,
      `Peer agent name: ${toAgent.name}`,
      `Peer agent id: ${toAgent.id}`,
      ``,
      `Use your bash tool to send the following question to the peer via the peer-ask`,
      `endpoint described in TOOLS.md, then report what the peer answered.`,
      ``,
      `Question for the peer:`,
      question,
    ].join("\n");

    logger.info({ fromAgentId, toAgentId, userId: session.user.id }, "Peer test triggered");
    const startedAt = Date.now();

    try {
      const result = await sendCommand(
        fromAgent.containerId,
        wrapperPrompt,
        undefined,
        fromAgent.type as AgentType,
      );

      return NextResponse.json({
        reply: result.text,
        usage: result.usage,
        durationMs: Date.now() - startedAt,
        from: { id: fromAgent.id, name: fromAgent.name },
        to: { id: toAgent.id, name: toAgent.name },
      });
    } catch (err) {
      logger.error({ err, fromAgentId, toAgentId }, "Peer test failed");
      const msg = err instanceof Error ? err.message : "internal error";
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Peer test handler crashed");
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
