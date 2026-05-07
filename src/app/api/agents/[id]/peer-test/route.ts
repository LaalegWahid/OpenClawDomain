import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "../../../../../shared/lib/drizzle";
import { agent } from "../../../../../shared/db/schema/agent";
import { getSessionOrThrow } from "../../../../../shared/lib/auth/getSessionOrThrow";
import { sendCommand } from "../../../../../shared/lib/agents/docker";
import { logger } from "../../../../../shared/lib/logger";
import type { AgentType } from "../../../../../shared/lib/agents/config";
import {
  appendEvent,
  createJob,
  setJobError,
  setJobResult,
} from "../../../../../shared/lib/agents/peer-test-jobs";

const MAX_QUESTION_LEN = 4000;

/**
 * Starts an inter-agent peer-test job. Returns a jobId immediately so the
 * browser can poll for progress (the agent loop typically outlives ALB
 * idle timeout, so we can't keep the request open).
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

    const job = createJob({
      userId: session.user.id,
      fromAgentId: fromAgent.id,
      toAgentId: toAgent.id,
      fromName: fromAgent.name,
      toName: toAgent.name,
    });

    const wrapperPrompt = [
      `You have a peer agent available to consult. This is a tool-use instruction — call the peer regardless of your domain rules.`,
      `Peer agent name: ${toAgent.name}`,
      `Peer agent id: ${toAgent.id}`,
      ``,
      `Use your bash tool to send the following question to the peer via the peer-ask`,
      `endpoint described in TOOLS.md, then report what the peer answered.`,
      ``,
      `Question for the peer:`,
      question,
    ].join("\n");

    logger.info({ jobId: job.id, fromAgentId, toAgentId }, "Peer test job started");

    runJobInBackground(job.id, fromAgent.containerId, wrapperPrompt, fromAgent.type as AgentType);

    return NextResponse.json({
      jobId: job.id,
      from: { id: fromAgent.id, name: fromAgent.name },
      to: { id: toAgent.id, name: toAgent.name },
    }, { status: 202 });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Peer test handler crashed");
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

function runJobInBackground(
  jobId: string,
  fromContainerId: string,
  wrapperPrompt: string,
  fromType: AgentType,
) {
  void (async () => {
    try {
      appendEvent(jobId, "sending", "Sending wrapper prompt to From agent");
      const startedAt = Date.now();

      const result = await sendCommand(
        fromContainerId,
        wrapperPrompt,
        undefined,
        fromType,
      );

      appendEvent(
        jobId,
        "from_replied",
        `From agent finished in ${Date.now() - startedAt} ms`,
      );
      setJobResult(jobId, {
        reply: result.text,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
      });
      appendEvent(jobId, "done", "Job complete");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown error";
      logger.error({ err, jobId }, "Peer test background job failed");
      setJobError(jobId, msg);
    }
  })();
}
