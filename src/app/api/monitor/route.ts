import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../shared/lib/drizzle";
import { agent, agentLog } from "../../../shared/db/schema";
import { eq, and, desc, inArray, sql } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const session = await getSessionOrThrow(req);

    // Get all agents owned by this user
    const userAgents = await db
      .select({ id: agent.id, name: agent.name })
      .from(agent)
      .where(eq(agent.userId, session.user.id));

    if (userAgents.length === 0) {
      return NextResponse.json({ logs: [], stats: { totalTokens: 0, totalInputTokens: 0, totalOutputTokens: 0, totalRequests: 0, avgDurationMs: 0 } });
    }

    const agentIds = userAgents.map((a) => a.id);

    // Fetch recent logs
    const logs = await db
      .select()
      .from(agentLog)
      .where(inArray(agentLog.agentId, agentIds))
      .orderBy(desc(agentLog.createdAt))
      .limit(100);

    // Aggregate stats
    const [stats] = await db
      .select({
        totalInputTokens: sql<number>`coalesce(sum(${agentLog.inputTokens}), 0)`,
        totalOutputTokens: sql<number>`coalesce(sum(${agentLog.outputTokens}), 0)`,
        totalRequests: sql<number>`count(*)`,
        avgDurationMs: sql<number>`coalesce(avg(${agentLog.durationMs}), 0)`,
      })
      .from(agentLog)
      .where(inArray(agentLog.agentId, agentIds));

    // Build agent name map
    const agentMap = Object.fromEntries(userAgents.map((a) => [a.id, a.name]));

    const enrichedLogs = logs.map((log) => ({
      ...log,
      agentName: agentMap[log.agentId] ?? "Unknown",
    }));

    return NextResponse.json({
      logs: enrichedLogs,
      stats: {
        totalInputTokens: Number(stats.totalInputTokens),
        totalOutputTokens: Number(stats.totalOutputTokens),
        totalTokens: Number(stats.totalInputTokens) + Number(stats.totalOutputTokens),
        totalRequests: Number(stats.totalRequests),
        avgDurationMs: Math.round(Number(stats.avgDurationMs)),
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Failed to fetch monitor data" }, { status: 500 });
  }
}
