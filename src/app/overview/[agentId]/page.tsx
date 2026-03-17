import { SidebarProvider } from "@/shared/components/ui/sidebar";
import { AppSidebar } from "@/feature/overview/components/app-sidebar";
import { AgentDetailContent } from "@/feature/agents/components/agent-detail-content";
import { getCurrentUser } from "@/feature/overview/actions/user.actions";

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const user = await getCurrentUser();
  const { agentId } = await params;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-stone-950 to-zinc-900">
      <SidebarProvider>
        <AppSidebar userEmail={user?.email} userName={user?.name} />
        <AgentDetailContent agentId={agentId} />
      </SidebarProvider>
    </div>
  );
}
