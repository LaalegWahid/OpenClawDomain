import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../../../../shared/lib/drizzle";
import { eq, and } from "drizzle-orm";
import { agent, agentChannel } from "../../../../../../shared/db/schema/agent";
import { logger } from "../../../../../../shared/lib/logger";
import { relaunchAgentWithChannels } from "../../../../../../shared/lib/agents/relaunch";

type Ctx = { params: Promise<{ id: string }> };
type Creds = {
  allowedJid?: string | null;
  allowedJids?: string[];
  allowedNumbers?: string[];
  allowOwnerChat?: boolean;
};

function getAllowedNumbers(creds: Creds): string[] {
  if (Array.isArray(creds.allowedNumbers)) return creds.allowedNumbers;
  // Migrate from legacy allowedJids: extract phone numbers from @s.whatsapp.net JIDs only
  const jids = Array.isArray(creds.allowedJids)
    ? creds.allowedJids
    : creds.allowedJid ? [creds.allowedJid] : [];
  return jids
    .filter((j) => j.includes("@s.whatsapp.net"))
    .map((j) => `+${j.split("@")[0]}`);
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
      allowedNumbers: getAllowedNumbers(creds),
      allowOwnerChat: creds.allowOwnerChat ?? false,
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

    const body = await req.json() as { phoneNumbers?: (string | null)[]; allowOwnerChat?: boolean };

    const allowedNumbers: string[] = (body.phoneNumbers ?? [])
      .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
      .map((p) => {
        const digits = p.replace(/[^\d]/g, "");
        return digits ? `+${digits}` : "";
      })
      .filter((p) => p.length > 1);

    const allowOwnerChat: boolean = body.allowOwnerChat ?? false;

    const [waChannel] = await db
      .select()
      .from(agentChannel)
      .where(and(eq(agentChannel.agentId, id), eq(agentChannel.platform, "whatsapp")))
      .limit(1);

    if (!waChannel) {
      return NextResponse.json({ error: "No WhatsApp channel found for this agent" }, { status: 404 });
    }

    const existingCredentials = (waChannel.credentials as Record<string, unknown>) ?? {};
    const { allowedJid: _removed, ...rest } = existingCredentials as Creds & Record<string, unknown>;
    void _removed;

    // JID list: only @s.whatsapp.net entries (phone numbers for others).
    // @lid is handled separately via the allowOwnerChat flag in the inbound route.
    const allowedJids: string[] = allowedNumbers.map((n) => `${n.replace("+", "")}@s.whatsapp.net`);

    await db
      .update(agentChannel)
      .set({ credentials: { ...rest, allowedNumbers, allowedJids, allowOwnerChat } })
      .where(eq(agentChannel.id, waChannel.id));

    logger.info({ agentId: id, allowedNumbers, allowOwnerChat }, "WhatsApp allowed numbers updated — relaunching");

    relaunchAgentWithChannels(id).catch((err) => {
      logger.error({ err, agentId: id }, "Failed to relaunch agent after allowed-number update");
    });

    return NextResponse.json({ ok: true, allowedNumbers, allowOwnerChat });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to update WhatsApp allowed numbers");
    return NextResponse.json({ error: "Failed to update allowed numbers" }, { status: 500 });
  }
}
