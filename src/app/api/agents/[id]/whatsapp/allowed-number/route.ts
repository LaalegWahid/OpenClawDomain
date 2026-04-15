import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../../../../shared/lib/drizzle";
import { eq, and } from "drizzle-orm";
import { agent, agentChannel } from "../../../../../../shared/db/schema/agent";
import { logger } from "../../../../../../shared/lib/logger";

type Ctx = { params: Promise<{ id: string }> };

async function getOwnedAgent(req: Request, agentId: string) {
  const session = await getSessionOrThrow(req);
  const [found] = await db
    .select()
    .from(agent)
    .where(and(eq(agent.id, agentId), eq(agent.userId, session.user.id)));
  return found ?? null;
}

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const found = await getOwnedAgent(req, id);
    if (!found) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const [waChannel] = await db
      .select({ credentials: agentChannel.credentials })
      .from(agentChannel)
      .where(and(eq(agentChannel.agentId, id), eq(agentChannel.platform, "whatsapp")))
      .limit(1);

    const allowedJid = (waChannel?.credentials as { allowedJid?: string } | null)?.allowedJid ?? null;
    return NextResponse.json({ allowedJid });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to get WhatsApp allowed number");
    return NextResponse.json({ error: "Failed to get allowed number" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const found = await getOwnedAgent(req, id);
    if (!found) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const body = await req.json() as { phoneNumber: string };
    const normalized = (body.phoneNumber ?? "").replace(/[^\d]/g, "");
    const allowedJid = normalized ? `${normalized}@s.whatsapp.net` : null;

    const [waChannel] = await db
      .select()
      .from(agentChannel)
      .where(and(eq(agentChannel.agentId, id), eq(agentChannel.platform, "whatsapp")))
      .limit(1);

    if (!waChannel) {
      return NextResponse.json({ error: "No WhatsApp channel found for this agent" }, { status: 404 });
    }

    const existingCredentials = (waChannel.credentials as Record<string, unknown>) ?? {};
    const updatedCredentials = allowedJid
      ? { ...existingCredentials, allowedJid }
      : { ...existingCredentials, allowedJid: null };

    await db
      .update(agentChannel)
      .set({ credentials: updatedCredentials })
      .where(eq(agentChannel.id, waChannel.id));

    logger.info({ agentId: id, allowedJid }, "WhatsApp allowed number updated");
    return NextResponse.json({ ok: true, allowedJid });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to update WhatsApp allowed number");
    return NextResponse.json({ error: "Failed to update allowed number" }, { status: 500 });
  }
}
