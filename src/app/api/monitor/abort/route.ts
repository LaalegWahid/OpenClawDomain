import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../../shared/lib/drizzle";
import { agent, agentLog } from "../../../../shared/db/schema";
import { eq, and } from "drizzle-orm";
import { abortTask } from "../../../../shared/lib/agents/docker";

export async function POST(req: Request) {
  try {
    const session = await getSessionOrThrow(req);
    const { logId } = await req.json();

    if (!logId) {
      return NextResponse.json({ error: "logId is required" }, { status: 400 });
    }

    // Verify the log belongs to an agent owned by this user
    const [log] = await db
      .select({ agentId: agentLog.agentId, status: agentLog.status })
      .from(agentLog)
      .where(eq(agentLog.id, logId));

    if (!log) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }

    const [owned] = await db
      .select({ id: agent.id })
      .from(agent)
      .where(and(eq(agent.id, log.agentId), eq(agent.userId, session.user.id)));

    if (!owned) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (log.status !== "running") {
      return NextResponse.json({ error: "Task is not running" }, { status: 400 });
    }

    const aborted = abortTask(logId);
    if (aborted) {
      await db.update(agentLog).set({
        status: "aborted",
        completedAt: new Date(),
      }).where(eq(agentLog.id, logId));
    }

    return NextResponse.json({ ok: true, aborted });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Failed to abort task" }, { status: 500 });
  }
}
