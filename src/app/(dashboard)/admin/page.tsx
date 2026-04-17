import { redirect } from "next/navigation";
import { auth } from "../../../shared/lib/auth/server";
import { headers } from "next/headers";
import { AdminContent } from "../../../feature/admin/components/admin-content";
import { getAdminDashboardData } from "../../../feature/admin/actions/admin.actions";

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/overview");

  const data = await getAdminDashboardData();

  return <AdminContent {...data} />;
}
