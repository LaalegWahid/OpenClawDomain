import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../../../../shared/lib/drizzle";
import { agent, agentMcp } from "../../../../../../shared/db/schema/agent";
import { eq, and } from "drizzle-orm";
import { logger } from "../../../../../../shared/lib/logger";
import { relaunchAgentWithChannels } from "../../../../../../shared/lib/agents/relaunch";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; serverId: string }> },
) {
  try {
    const session = await getSessionOrThrow(req);
    const { id, serverId } = await params;

    const [found] = await db
      .select()
      .from(agent)
      .where(and(eq(agent.id, id), eq(agent.userId, session.user.id)));

    if (!found) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const body = await req.json() as { enabled?: boolean };
    if (typeof body.enabled !== "boolean") {
      return NextResponse.json({ error: "enabled (boolean) is required" }, { status: 400 });
    }

    await db
      .update(agentMcp)
      .set({ enabled: body.enabled })
      .where(and(eq(agentMcp.id, serverId), eq(agentMcp.agentId, id)));

    void relaunchAgentWithChannels(id).catch((err) =>
      logger.error({ err, agentId: id }, "Failed to relaunch agent after MCP update"),
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to update MCP server");
    return NextResponse.json({ error: "Failed to update MCP server" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; serverId: string }> },
) {
  try {
    const session = await getSessionOrThrow(req);
    const { id, serverId } = await params;

    const [found] = await db
      .select()
      .from(agent)
      .where(and(eq(agent.id, id), eq(agent.userId, session.user.id)));

    if (!found) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    await db
      .delete(agentMcp)
      .where(and(eq(agentMcp.id, serverId), eq(agentMcp.agentId, id)));

    void relaunchAgentWithChannels(id).catch((err) =>
      logger.error({ err, agentId: id }, "Failed to relaunch agent after MCP delete"),
    );
    logger.info({ agentId: id, serverId }, "MCP server deleted");
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to delete MCP server");
    return NextResponse.json({ error: "Failed to delete MCP server" }, { status: 500 });
  }
}
