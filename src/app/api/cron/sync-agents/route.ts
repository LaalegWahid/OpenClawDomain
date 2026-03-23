import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "../../../../shared/lib/drizzle";
import { agent } from "../../../../shared/db/schema";
import { getContainerStatus, launchContainer } from "../../../../shared/lib/agents/docker";
import { logger } from "../../../../shared/lib/logger";
import { env } from "@/shared/config/env";
import { AgentType } from "../../../../shared/lib/agents/config";


export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeAgents = await db
    .select({ id: agent.id, containerId: agent.containerId, userId: agent.userId, systemPrompt: agent.systemPrompt, type: agent.type })
    .from(agent)
    .where(inArray(agent.status, ["active", "starting"]));

  let synced = 0;
  let restarted = 0;

  for (const ag of activeAgents) {
    if (!ag.containerId) continue;
    const status = await getContainerStatus(ag.containerId);
    if (status === "stopped" || status === "deprovisioning" || status === "not_found") {
      // Attempt auto-restart
      try {
        const result = await launchContainer(
          ag.userId,
          ag.id,
          ag.systemPrompt ?? "",
          (ag.type as AgentType) || "operations",
        );
        await db.update(agent).set({ status: "starting", containerId: result.containerId }).where(eq(agent.id, ag.id));
        logger.info({ agentId: ag.id, newTaskArn: result.containerId }, "Agent auto-restarted");
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