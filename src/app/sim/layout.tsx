import { ReactNode } from "react";
import { DashboardShell } from "../../feature/overview/components/dashboard-shell";

export default function SimLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell
      userEmail="demo@openclaw.dev"
      userName="Demo User"
      pageTitle="OpenClaw — Simulated Environment"
      isAdmin={false}
    >
      {children}
    </DashboardShell>
  );
}
