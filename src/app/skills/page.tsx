import { DashboardShell } from "../../feature/overview/components/dashboard-shell";
import { SkillsContent } from "../../feature/skills/components/skills-content";
import { getCurrentUser } from "../../feature/overview/actions/user.actions";

export default async function SkillsPage() {
  const user = await getCurrentUser();

  return (
    <DashboardShell
      userEmail={user?.email}
      userName={user?.name}
      pageTitle="Skills"
      isAdmin={user?.role === "admin"}
    >
      <SkillsContent />
    </DashboardShell>
  );
}
