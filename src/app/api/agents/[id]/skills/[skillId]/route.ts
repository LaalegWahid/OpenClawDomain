import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../../../../shared/lib/drizzle";
import { agent } from "../../../../../../shared/db/schema/agent";
import { agentSkill } from "../../../../../../shared/db/schema/skill";
import { eq, and } from "drizzle-orm";
import { logger } from "../../../../../../shared/lib/logger";
import { relaunchAgentWithChannels } from "../../../../../../shared/lib/agents/relaunch";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; skillId: string }> },
) {
  try {
    const session = await getSessionOrThrow(req);
    const { id, skillId } = await params;

    const [found] = await db
      .select()
      .from(agent)
      .where(and(eq(agent.id, id), eq(agent.userId, session.user.id)));

    if (!found) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    await db
      .delete(agentSkill)
      .where(and(eq(agentSkill.agentId, id), eq(agentSkill.skillId, skillId)));

    logger.info({ agentId: id, skillId }, "Skill unlinked from agent");

    // Relaunch so the container drops the removed skill
    await relaunchAgentWithChannels(id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to remove skill from agent");
    return NextResponse.json({ error: "Failed to remove skill from agent" }, { status: 500 });
  }
}
