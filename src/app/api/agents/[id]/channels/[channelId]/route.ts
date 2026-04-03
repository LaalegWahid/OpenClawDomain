import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../../../../shared/lib/drizzle";
import { agent, agentChannel } from "../../../../../../shared/db/schema/agent";
import { eq, and } from "drizzle-orm";
import { logger } from "../../../../../../shared/lib/logger";
import { relaunchAgentWithChannels } from "../../../../../../shared/lib/agents/relaunch";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; channelId: string }> },
) {
  try {
    const session = await getSessionOrThrow(req);
    const { id, channelId } = await params;

    const [found] = await db
      .select()
      .from(agent)
      .where(and(eq(agent.id, id), eq(agent.userId, session.user.id)));

    if (!found) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const [deleted] = await db
      .delete(agentChannel)
      .where(and(eq(agentChannel.id, channelId), eq(agentChannel.agentId, id)))
      .returning({ platform: agentChannel.platform });

    logger.info({ agentId: id, channelId }, "Channel deleted");

    // Relaunch so the removed channel is no longer active in openclaw.json
    // (Telegram is webhook-only — no relaunch needed)
    if (deleted?.platform !== "telegram") {
      relaunchAgentWithChannels(id).catch((err) =>
        logger.error({ err, agentId: id, channelId }, "Relaunch after channel delete failed"),
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to delete channel");
    return NextResponse.json({ error: "Failed to delete channel" }, { status: 500 });
  }
}
