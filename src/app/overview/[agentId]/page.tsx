import { SidebarProvider } from "../../../shared/components/ui/sidebar";
import { AppSidebar } from "../../../feature/overview/components/app-sidebar";
import { AgentDetailContent } from "../../../feature/agents/components/agent-detail-content";
import { getCurrentUser } from "../../../feature/overview/actions/user.actions";
import { DashboardShell } from "@/feature/overview/components/dashboard-shell";

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const user = await getCurrentUser();
  const { agentId } = await params;

  return (
   <DashboardShell
         userEmail={user?.email}
         userName={user?.name}
         pageTitle="Dashboard"
         isAdmin={user?.role === "admin"}
       >
         <AgentDetailContent agentId={agentId} />
       </DashboardShell>
  );
}
