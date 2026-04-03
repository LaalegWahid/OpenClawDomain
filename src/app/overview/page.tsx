import { DashboardShell } from "../../feature/overview/components/dashboard-shell";
import { OverviewContent } from "../../feature/overview/components/overview-content";
import { getCurrentUser } from "../../feature/overview/actions/user.actions";

export default async function OverviewPage() {
  const user = await getCurrentUser();

  return (
    <DashboardShell
      userEmail={user?.email}
      userName={user?.name}
      pageTitle="Dashboard"
      isAdmin={user?.role === "admin"}
    >
      <OverviewContent userName={user?.name} />
    </DashboardShell>
  );
}
