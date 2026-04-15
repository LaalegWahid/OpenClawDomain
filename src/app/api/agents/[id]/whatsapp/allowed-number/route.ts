import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../../../../shared/lib/drizzle";
import { eq, and } from "drizzle-orm";
import { agent, agentChannel } from "../../../../../../shared/db/schema/agent";
import { logger } from "../../../../../../shared/lib/logger";

type Ctx = { params: Promise<{ id: string }> };
type Creds = { allowedJid?: string | null; allowedJids?: string[]; discoveredOwnerJid?: string };

function getAllowedJids(creds: Creds): string[] {
  if (Array.isArray(creds.allowedJids)) return creds.allowedJids;
  if (creds.allowedJid) return [creds.allowedJid];
  return [];
}

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
      allowedJids: getAllowedJids(creds),
      discoveredOwnerJid: creds.discoveredOwnerJid ?? null,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to get WhatsApp allowed numbers");
    return NextResponse.json({ error: "Failed to get allowed numbers" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const found = await getOwnedAgent(req, id);
    if (!found) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    // Accept { allowedJids: string[] } — the full list.
    // Each entry is either a raw JID (e.g. "266962416451807@lid") or a
    // phone number (digits only), which is stored as "digits@s.whatsapp.net".
    const body = await req.json() as { allowedJids: (string | null)[] };
    const allowedJids: string[] = (body.allowedJids ?? [])
      .filter((j): j is string => typeof j === "string" && j.trim().length > 0)
      .map((j) => {
        if (j.includes("@")) return j; // already a full JID
        const digits = j.replace(/[^\d]/g, "");
        return digits ? `${digits}@s.whatsapp.net` : "";
      })
      .filter((j) => j.length > 0);

    const [waChannel] = await db
      .select()
      .from(agentChannel)
      .where(and(eq(agentChannel.agentId, id), eq(agentChannel.platform, "whatsapp")))
      .limit(1);

    if (!waChannel) {
      return NextResponse.json({ error: "No WhatsApp channel found for this agent" }, { status: 404 });
    }

    const existingCredentials = (waChannel.credentials as Record<string, unknown>) ?? {};
    // Migrate: remove legacy allowedJid field, use allowedJids array
    const { allowedJid: _removed, ...rest } = existingCredentials as Creds & Record<string, unknown>;
    void _removed;
    await db
      .update(agentChannel)
      .set({ credentials: { ...rest, allowedJids } })
      .where(eq(agentChannel.id, waChannel.id));

    logger.info({ agentId: id, allowedJids }, "WhatsApp allowed JIDs updated");
    return NextResponse.json({ ok: true, allowedJids });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to update WhatsApp allowed JIDs");
    return NextResponse.json({ error: "Failed to update allowed JIDs" }, { status: 500 });
  }
}
