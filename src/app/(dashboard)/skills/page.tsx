import { SkillsContent } from "../../../feature/skills/components/skills-content";
import { getCurrentUser } from "../../../feature/overview/actions/user.actions";

export default async function SkillsPage() {
  const user = await getCurrentUser();

  return (
    <SkillsContent />
  );
}
