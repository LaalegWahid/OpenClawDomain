import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../../../shared/lib/drizzle";
import { agent, agentLog } from "../../../../../../shared/db/schema/agent";
import { sendCommand } from "../../../../../../shared/lib/agents/docker";
import { logger } from "../../../../../../shared/lib/logger";
import type { AgentType } from "../../../../../../shared/lib/agents/config";
import {
  appendEvent,
  findActivePairJob,
  setPeerReply,
} from "../../../../../../shared/lib/agents/peer-test-jobs";

const MAX_QUESTION_LEN = 4000;

function verifyGatewayToken(req: Request): boolean {
  const expected = process.env.GATEWAY_TOKEN;
  if (!expected) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${expected}`;
}

/**
 * Agent-to-agent ask endpoint.
 *
 * One agent's container calls this with the GATEWAY_TOKEN it already holds to
 * route a question to another agent in the same user's account. The reply is
 * returned synchronously. The two agents must belong to the same user — that's
 * the only permission boundary.
 *
 * Body: { fromAgentId: uuid, question: string }
 * URL param `id`: the TARGET agent (the one being asked).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!verifyGatewayToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: toAgentId } = await params;
    const body = await req.json().catch(() => ({}));
    const fromAgentId = (body.fromAgentId as string | undefined)?.trim();
    const question = (body.question as string | undefined)?.trim();

    if (!fromAgentId) {
      return NextResponse.json({ error: "fromAgentId is required" }, { status: 400 });
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
      return NextResponse.json({ error: "fromAgentId and target must differ" }, { status: 400 });
    }

    const [fromAgent] = await db
      .select({ id: agent.id, userId: agent.userId, name: agent.name })
      .from(agent)
      .where(eq(agent.id, fromAgentId))
      .limit(1);
    if (!fromAgent) {
      return NextResponse.json({ error: "fromAgent not found" }, { status: 404 });
    }

    const [toAgent] = await db
      .select()
      .from(agent)
      .where(eq(agent.id, toAgentId))
      .limit(1);
    if (!toAgent) {
      return NextResponse.json({ error: "target agent not found" }, { status: 404 });
    }

    if (toAgent.userId !== fromAgent.userId) {
      logger.warn(
        { fromAgentId, toAgentId, fromUser: fromAgent.userId, toUser: toAgent.userId },
        "Cross-user peer ask blocked",
      );
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (toAgent.status === "stopped") {
      return NextResponse.json({ error: "target agent is stopped" }, { status: 409 });
    }
    if (toAgent.status === "starting" || !toAgent.containerId) {
      return NextResponse.json({ error: "target agent is starting" }, { status: 409 });
    }
    if (toAgent.status === "error") {
      return NextResponse.json({ error: "target agent is in error state" }, { status: 409 });
    }

    logger.info({ fromAgentId, toAgentId }, "Peer ask");

    // Surface progress to any active peer-test job watching this pair.
    const trackedJob = findActivePairJob(fromAgentId, toAgentId);
    if (trackedJob) {
      appendEvent(
        trackedJob.id,
        "peer_received",
        `Peer ${toAgent.name} received the question`,
        question.length > 200 ? `${question.slice(0, 200)}…` : question,
      );
    }

    const [logEntry] = await db
      .insert(agentLog)
      .values({
        agentId: toAgentId,
        source: "peer",
        status: "running",
        userPrompt: `[peer:${fromAgent.name}] ${question}`,
      })
      .returning();

    const startedAt = Date.now();
    try {
      const result = await sendCommand(
        toAgent.containerId,
        question,
        undefined,
        toAgent.type as AgentType,
      );

      await db
        .update(agentLog)
        .set({
          status: "completed",
          assistantResponse: result.text,
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          durationMs: Date.now() - startedAt,
          completedAt: new Date(),
        })
        .where(eq(agentLog.id, logEntry.id));

      if (trackedJob) {
        setPeerReply(trackedJob.id, result.text);
        appendEvent(
          trackedJob.id,
          "peer_replied",
          `Peer ${toAgent.name} replied (${Date.now() - startedAt} ms, in ${result.usage.inputTokens} / out ${result.usage.outputTokens})`,
          result.text.length > 400 ? `${result.text.slice(0, 400)}…` : result.text,
        );
      }

      return NextResponse.json({
        reply: result.text,
        usage: result.usage,
        from: { id: fromAgent.id, name: fromAgent.name },
        to: { id: toAgent.id, name: toAgent.name },
      });
    } catch (err) {
      await db
        .update(agentLog)
        .set({
          status: "error",
          durationMs: Date.now() - startedAt,
          completedAt: new Date(),
        })
        .where(eq(agentLog.id, logEntry.id));
      throw err;
    }
  } catch (err) {
    logger.error({ err }, "Peer ask failed");
    const msg = err instanceof Error ? err.message : "internal error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
