import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSessionOrThrow } from "../../../../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../../../../shared/lib/drizzle";
import { agent } from "../../../../../../shared/db/schema";
import { getAgentLogs } from "../../../../../../shared/lib/ecs/logs";

function requireAdmin(role: string | null | undefined) {
  if (role !== "admin") {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionOrThrow(req);
  requireAdmin(session.user.role);

  const { id } = await params;
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit")) || 500, 1000);
  const nextToken = url.searchParams.get("nextToken") ?? undefined;

  const [row] = await db
    .select({
      id: agent.id,
      name: agent.name,
      type: agent.type,
      status: agent.status,
      containerId: agent.containerId,
    })
    .from(agent)
    .where(eq(agent.id, id))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  if (!row.containerId) {
    return NextResponse.json({
      agent: row,
      lines: [],
      logGroup: "",
      logStream: "",
      error: "Agent has no container ID yet.",
      nextForwardToken: null,
    });
  }

  const result = await getAgentLogs(row.containerId, row.type, { limit, nextToken });

  return NextResponse.json({ agent: row, ...result });
}
