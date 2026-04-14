import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../../../shared/lib/drizzle";
import { agent } from "../../../../../shared/db/schema/agent";
import { eq, and } from "drizzle-orm";
import { relaunchAgentWithChannels } from "../../../../../shared/lib/agents/relaunch";
import { logger } from "../../../../../shared/lib/logger";

export async function POST(
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

    await relaunchAgentWithChannels(id);

    logger.info({ agentId: id, userId: session.user.id }, "Agent restarted");
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to restart agent");
    return NextResponse.json(
      { error: "Unhandled error in POST /api/agents/[id]/restart. Check server logs." },
      { status: 500 },
    );
  }
}
