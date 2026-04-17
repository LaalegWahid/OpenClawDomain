import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../../../shared/lib/drizzle";
import { agent } from "../../../../../shared/db/schema/agent";
import { relaunchAgentWithChannels } from "../../../../../shared/lib/agents/relaunch";
import { logger } from "../../../../../shared/lib/logger";

function requireAdmin(role: string | null | undefined) {
  if (role !== "admin") {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionOrThrow(req);
    requireAdmin(session.user.role);

    const allAgents = await db.select({ id: agent.id }).from(agent);

    const results = await Promise.allSettled(
      allAgents.map((a) => relaunchAgentWithChannels(a.id)),
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - succeeded;

    logger.info(
      { total: results.length, succeeded, failed, adminId: session.user.id },
      "Admin restarted all agents",
    );

    return NextResponse.json({ total: results.length, succeeded, failed });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to restart all agents");
    return NextResponse.json(
      { error: "Unhandled error in POST /api/admin/agents/restart-all." },
      { status: 500 },
    );
  }
}
