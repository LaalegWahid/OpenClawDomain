import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../../../shared/lib/auth/getSessionOrThrow";
import { getJob } from "../../../../../../shared/lib/agents/peer-test-jobs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; jobId: string }> },
) {
  try {
    const session = await getSessionOrThrow(req);
    const { id: fromAgentId, jobId } = await params;

    const job = getJob(jobId);
    if (!job) {
      return NextResponse.json({ error: "job not found or expired" }, { status: 404 });
    }
    if (job.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (job.fromAgentId !== fromAgentId) {
      return NextResponse.json({ error: "job does not belong to this agent" }, { status: 400 });
    }

    return NextResponse.json({
      id: job.id,
      status: job.status,
      events: job.events,
      result: job.result,
      peerReply: job.peerReply,
      error: job.error,
      from: { id: job.fromAgentId, name: job.fromName },
      to: { id: job.toAgentId, name: job.toName },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
