import { OverviewContent } from "../../../feature/overview/components/overview-content";
import { getCurrentUser } from "../../../feature/overview/actions/user.actions";

export default async function OverviewPage() {
  const user = await getCurrentUser();

  return (
    <OverviewContent userName={user?.name} />
  );
}
