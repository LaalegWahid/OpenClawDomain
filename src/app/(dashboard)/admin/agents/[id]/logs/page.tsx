import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "../../../../../../shared/lib/auth/server";
import { db } from "../../../../../../shared/lib/drizzle";
import { agent, user } from "../../../../../../shared/db/schema";
import { getAgentLogs } from "../../../../../../shared/lib/ecs/logs";
import { AgentLogsContent } from "../../../../../../feature/admin/components/agent-logs-content";

export default async function AgentLogsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/overview");

  const { id } = await params;

  const [row] = await db
    .select({
      id: agent.id,
      name: agent.name,
      botUsername: agent.botUsername,
      type: agent.type,
      status: agent.status,
      containerId: agent.containerId,
      createdAt: agent.createdAt,
      ownerEmail: user.email,
      ownerName: user.name,
    })
    .from(agent)
    .leftJoin(user, eq(agent.userId, user.id))
    .where(eq(agent.id, id))
    .limit(1);

  if (!row) notFound();

  const initial = row.containerId
    ? await getAgentLogs(row.containerId, row.type, { limit: 500 })
    : {
        lines: [],
        logGroup: "",
        logStream: "",
        error: "Agent has no container ID yet.",
        nextForwardToken: null,
      };

  return (
    <AgentLogsContent
      agent={{
        id: row.id,
        name: row.name,
        botUsername: row.botUsername,
        type: row.type,
        status: row.status,
        containerId: row.containerId,
        createdAt: row.createdAt.toISOString(),
        ownerEmail: row.ownerEmail,
        ownerName: row.ownerName,
      }}
      initial={initial}
    />
  );
}
