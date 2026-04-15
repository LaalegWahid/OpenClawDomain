import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../../../../shared/lib/drizzle";
import { eq, and } from "drizzle-orm";
import { agent, agentChannel } from "../../../../../../shared/db/schema/agent";
import { logger } from "../../../../../../shared/lib/logger";

type Ctx = { params: Promise<{ id: string }> };
type Creds = { allowedJid?: string | null; discoveredOwnerJid?: string };

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

    const creds = (waChannel?.credentials ?? {}) as Creds;
    return NextResponse.json({
      allowedJid: creds.allowedJid ?? null,
      discoveredOwnerJid: creds.discoveredOwnerJid ?? null,
    });
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

    // Accept a raw JID string (e.g. "266962416451807@lid") or null/empty to clear
    const body = await req.json() as { jid?: string | null };
    const allowedJid = body.jid || null;

    const [waChannel] = await db
      .select()
      .from(agentChannel)
      .where(and(eq(agentChannel.agentId, id), eq(agentChannel.platform, "whatsapp")))
      .limit(1);

    if (!waChannel) {
      return NextResponse.json({ error: "No WhatsApp channel found for this agent" }, { status: 404 });
    }

    const existingCredentials = (waChannel.credentials as Record<string, unknown>) ?? {};
    await db
      .update(agentChannel)
      .set({ credentials: { ...existingCredentials, allowedJid } })
      .where(eq(agentChannel.id, waChannel.id));

    logger.info({ agentId: id, allowedJid }, "WhatsApp allowed JID updated");
    return NextResponse.json({ ok: true, allowedJid });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to update WhatsApp allowed JID");
    return NextResponse.json({ error: "Failed to update allowed JID" }, { status: 500 });
  }
}
