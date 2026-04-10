import { AgentDetailContent } from "@/feature/agents/components/agent-detail-content";
import { getCurrentUser } from "@/feature/overview/actions/user.actions";

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const user = await getCurrentUser();
  const { agentId } = await params;

  return <AgentDetailContent agentId={agentId} />;
}
