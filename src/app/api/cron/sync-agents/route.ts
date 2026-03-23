import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "../../../../shared/lib/drizzle";
import { agent } from "../../../../shared/db/schema";
import { getContainerStatus } from "../../../../shared/lib/agents/docker";
import { logger } from "../../../../shared/lib/logger";
import { env } from "@/shared/config/env";


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

  for (const ag of activeAgents) {
    if (!ag.containerId) continue;
    const status = await getContainerStatus(ag.containerId);
    if (status === "stopped" || status === "deprovisioning" || status === "not_found") {
      await db.update(agent).set({ status: "error" }).where(eq(agent.id, ag.id));
      logger.info({ agentId: ag.id }, "Agent marked error — ECS task stopped");
      synced++;
    }
  }

  return NextResponse.json({ synced });
}