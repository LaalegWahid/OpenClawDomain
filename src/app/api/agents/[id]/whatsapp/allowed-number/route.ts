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
  discoveredOwnerJid?: string;
};

function getAllowedNumbers(creds: Creds): string[] {
  if (Array.isArray(creds.allowedNumbers)) return creds.allowedNumbers;
  // Migrate from legacy allowedJids: extract E.164 from "@s.whatsapp.net" JIDs only (not @lid)
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

    // Accept { phoneNumbers: string[] } — E.164 or raw digits, full replacement list.
    const body = await req.json() as { phoneNumbers: (string | null)[] };
    const allowedNumbers: string[] = (body.phoneNumbers ?? [])
      .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
      .map((p) => {
        const digits = p.replace(/[^\d]/g, "");
        return digits ? `+${digits}` : "";
      })
      .filter((p) => p.length > 1); // "+digits"

    // Also store as JIDs for Next.js-layer fallback filtering
    const allowedJids: string[] = allowedNumbers.map((n) => `${n.replace("+", "")}@s.whatsapp.net`);

    const [waChannel] = await db
      .select()
      .from(agentChannel)
      .where(and(eq(agentChannel.agentId, id), eq(agentChannel.platform, "whatsapp")))
      .limit(1);

    if (!waChannel) {
      return NextResponse.json({ error: "No WhatsApp channel found for this agent" }, { status: 404 });
    }

    const existingCredentials = (waChannel.credentials as Record<string, unknown>) ?? {};
    // Migrate: remove legacy single-JID field
    const { allowedJid: _removed, ...rest } = existingCredentials as Creds & Record<string, unknown>;
    void _removed;

    await db
      .update(agentChannel)
      .set({ credentials: { ...rest, allowedNumbers, allowedJids } })
      .where(eq(agentChannel.id, waChannel.id));

    logger.info({ agentId: id, allowedNumbers }, "WhatsApp allowed numbers updated — relaunching");

    // Relaunch so the container picks up the new WHATSAPP_ALLOW_FROM env var
    relaunchAgentWithChannels(id).catch((err) => {
      logger.error({ err, agentId: id }, "Failed to relaunch agent after allowed-number update");
    });

    return NextResponse.json({ ok: true, allowedNumbers });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to update WhatsApp allowed numbers");
    return NextResponse.json({ error: "Failed to update allowed numbers" }, { status: 500 });
  }
}
