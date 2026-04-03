import { redirect } from "next/navigation";
import { auth } from "../../shared/lib/auth/server";
import { headers } from "next/headers";
import { getServiceEnabled } from "../../shared/lib/service/status";
import { DashboardShell } from "../../feature/overview/components/dashboard-shell";
import { AdminContent } from "../../feature/admin/components/admin-content";

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/overview");

  const serviceEnabled = await getServiceEnabled();

  return (
    <DashboardShell
      userEmail={session.user.email}
      userName={session.user.name}
      pageTitle="Admin"
      isAdmin
    >
      <AdminContent initialEnabled={serviceEnabled} />
    </DashboardShell>
  );
}
