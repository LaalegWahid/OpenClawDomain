import { DashboardShell } from "../../feature/overview/components/dashboard-shell";
import { SettingsContent } from "../../feature/settings/components/settings-content";
import { getCurrentUser } from "../../feature/overview/actions/user.actions";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <DashboardShell
      userEmail={user?.email}
      userName={user?.name}
      pageTitle="Settings"
      isAdmin={user?.role === "admin"}
    >
      <SettingsContent userName={user?.name} userEmail={user?.email} />
    </DashboardShell>
  );
}
