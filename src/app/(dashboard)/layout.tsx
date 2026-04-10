import { ReactNode } from "react";
import { DashboardShell } from "../../feature/overview/components/dashboard-shell";
import { getCurrentUser } from "../../feature/overview/actions/user.actions";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return (
    <DashboardShell
      userEmail={user?.email}
      userName={user?.name}
      pageTitle="OpenClaw"
      isAdmin={user?.role === "admin"}
    >
      {children}
    </DashboardShell>
  );
}