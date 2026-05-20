import { redirect } from "next/navigation";
import { auth } from "../../../shared/lib/auth/server";
import { headers } from "next/headers";
import { getServiceEnabled } from "../../../shared/lib/service/status";
import { AdminContent } from "../../../feature/admin/components/admin-content";
import { db } from "../../../shared/lib/drizzle";
import { user, agent, agentLog, agentCreationFeedback } from "../../../shared/db/schema";
import { sql, desc, eq } from "drizzle-orm";
import { getVisitStats } from "../../../shared/lib/rum/visits";

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/overview");

  // Fast aggregates + tables: awaited so the page shell paints with real data.
  const serviceEnabled = await getServiceEnabled();

  const [
    [{ totalUsers }],
    [{ totalAgents }],
    [{ activeAgents }],
    [{ adminCount }],
    userRows,
    agentRows,
    feedbackRows,
  ] = await Promise.all([
      db.select({ totalUsers: sql<number>`count(*)::int` }).from(user),
      db.select({ totalAgents: sql<number>`count(*)::int` }).from(agent),
      db
        .select({ activeAgents: sql<number>`count(*)::int` })
        .from(agent)
        .where(eq(agent.status, "active")),
      db
        .select({ adminCount: sql<number>`count(*)::int` })
        .from(user)
        .where(eq(user.role, "admin")),
      db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          banned: user.banned,
          createdAt: user.createdAt,
          developerAccess: user.developerAccess,
          agentCount: sql<number>`coalesce(count(${agent.id}), 0)::int`,
        })
        .from(user)
        .leftJoin(agent, eq(agent.userId, user.id))
        .groupBy(user.id)
        .orderBy(desc(user.createdAt)),
      db
        .select({
          id: agent.id,
          name: agent.name,
          botUsername: agent.botUsername,
          status: agent.status,
          type: agent.type,
          isPrimary: agent.isPrimary,
          containerId: agent.containerId,
          apiProvider: agent.apiProvider,
          agentModel: agent.agentModel,
          openclawAgentId: agent.openclawAgentId,
          createdAt: agent.createdAt,
          updatedAt: agent.updatedAt,
          ownerId: user.id,
          ownerEmail: user.email,
          ownerName: user.name,
        })
        .from(agent)
        .leftJoin(user, eq(agent.userId, user.id))
        .orderBy(desc(agent.createdAt)),
      db
        .select({
          id: agentCreationFeedback.id,
          rating: agentCreationFeedback.rating,
          comment: agentCreationFeedback.comment,
          createdAt: agentCreationFeedback.createdAt,
          agentId: agentCreationFeedback.agentId,
          agentName: agent.name,
          userId: agentCreationFeedback.userId,
          userEmail: user.email,
          userName: user.name,
        })
        .from(agentCreationFeedback)
        .leftJoin(agent, eq(agentCreationFeedback.agentId, agent.id))
        .leftJoin(user, eq(agentCreationFeedback.userId, user.id))
        .orderBy(desc(agentCreationFeedback.createdAt)),
    ]);

  // Slow/independent queries (30-day day-series scans + external RUM): NOT awaited.
  // They stream into their own <Suspense> boundaries so they don't hold up the shell.
  const userGrowthPromise = db
    .execute(sql<{ day: string; count: number }>`
      select to_char(d::date, 'YYYY-MM-DD') as day,
             (select count(*)::int from ${user} u where u.created_at::date = d::date) as count
      from generate_series(current_date - interval '29 days', current_date, interval '1 day') d
      order by d
    `)
    .then(toSeries);

  const agentActivityPromise = db
    .execute(sql<{ day: string; count: number }>`
      select to_char(d::date, 'YYYY-MM-DD') as day,
             (select count(*)::int from ${agentLog} l where l.created_at::date = d::date) as count
      from generate_series(current_date - interval '29 days', current_date, interval '1 day') d
      order by d
    `)
    .then(toSeries);

  const visitsPromise = getVisitStats();

  const avgRating =
    feedbackRows.length > 0
      ? feedbackRows.reduce((sum, f) => sum + f.rating, 0) / feedbackRows.length
      : 0;

  return (
    <AdminContent
      initialEnabled={serviceEnabled}
      stats={{
        totalUsers,
        totalAgents,
        activeAgents,
        adminCount,
      }}
      users={userRows.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      }))}
      agents={agentRows.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      }))}
      userGrowth={userGrowthPromise}
      agentActivity={agentActivityPromise}
      feedback={feedbackRows.map((f) => ({
        id: f.id,
        rating: f.rating,
        comment: f.comment,
        createdAt: f.createdAt.toISOString(),
        agentId: f.agentId,
        agentName: f.agentName,
        userEmail: f.userEmail,
        userName: f.userName,
      }))}
      avgRating={avgRating}
      visits={visitsPromise}
    />
  );
}

// db.execute returns either an array or a { rows } object depending on driver.
function toSeries(res: unknown): { day: string; count: number }[] {
  const rows =
    (res as { rows?: Array<{ day: string; count: number }> }).rows ??
    (res as Array<{ day: string; count: number }>);
  return rows.map((r) => ({ day: r.day, count: Number(r.count) }));
}
