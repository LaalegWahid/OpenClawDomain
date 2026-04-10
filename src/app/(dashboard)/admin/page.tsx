import { redirect } from "next/navigation";
import { auth } from "../../../shared/lib/auth/server";
import { headers } from "next/headers";
import { getServiceEnabled } from "../../../shared/lib/service/status";
import { AdminContent } from "../../../feature/admin/components/admin-content";

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/overview");

  const serviceEnabled = await getServiceEnabled();

  return (
    <AdminContent initialEnabled={serviceEnabled} />
  );
}
