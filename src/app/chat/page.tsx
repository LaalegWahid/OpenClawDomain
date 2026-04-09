import { DashboardShell } from "../../feature/overview/components/dashboard-shell";
import { getCurrentUser } from "../../feature/overview/actions/user.actions";
import { ChatPageContent } from "@/feature/chat/components/chat-page-content";

export default async function OverviewPage() {
  const user = await getCurrentUser();

  return (
    <DashboardShell
      userEmail={user?.email}
      userName={user?.name}
      pageTitle="Dashboard"
      isAdmin={user?.role === "admin"}
    >
      <ChatPageContent/>
    </DashboardShell>
  );
}
