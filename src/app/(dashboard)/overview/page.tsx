import { OverviewContent } from "../../../feature/overview/components/overview-content";
import { getCurrentUser } from "../../../feature/overview/actions/user.actions";
import { AdminContent } from "../../../feature/admin/components/admin-content";
import { getAdminDashboardData } from "../../../feature/admin/actions/admin.actions";

export default async function OverviewPage() {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "admin";
  const adminData = isAdmin ? await getAdminDashboardData() : null;

  return (
    <>
      <OverviewContent userName={user?.name} />
     
    </>
  );
}
