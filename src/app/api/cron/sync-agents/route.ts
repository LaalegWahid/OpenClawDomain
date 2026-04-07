import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "../../../../shared/lib/drizzle";
import { agent } from "../../../../shared/db/schema";
import { getContainerStatus } from "../../../../shared/lib/agents/docker";
import { relaunchAgentWithChannels } from "../../../../shared/lib/agents/relaunch";
import { logger } from "../../../../shared/lib/logger";
import { env } from "../../../../shared/config/env";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeAgents = await db
    .select({ id: agent.id, containerId: agent.containerId })
    .from(agent)
    .where(inArray(agent.status, ["active", "starting"]));

  let synced = 0;
  let restarted = 0;

  for (const ag of activeAgents) {
    if (!ag.containerId) continue;
    const status = await getContainerStatus(ag.containerId);
    if (status === "stopped" || status === "deprovisioning" || status === "not_found") {
      // Use relaunchAgentWithChannels so WhatsApp / MCP channel config is preserved.
      // (bare launchContainer would restart the agent without WHATSAPP_ENABLED, etc.)
      try {
        await relaunchAgentWithChannels(ag.id);
        logger.info({ agentId: ag.id }, "Agent auto-restarted by cron");
        restarted++;
      } catch (err) {
        await db.update(agent).set({ status: "error" }).where(eq(agent.id, ag.id));
        logger.error({ agentId: ag.id, err }, "Agent auto-restart failed, marked error");
      }
      synced++;
    }
  }

  return NextResponse.json({ synced, restarted });
}