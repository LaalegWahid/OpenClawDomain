import { DashboardShell } from "@/feature/overview/components/dashboard-shell";
import { BillingContent } from "@/feature/subscription/components/billing-content";
import { getCurrentUser } from "@/feature/overview/actions/user.actions";

export default async function BillingPage() {
  const user = await getCurrentUser();

  return (
    <DashboardShell
      userEmail={user?.email}
      userName={user?.name}
      pageTitle="Billing"
    >
      <BillingContent />
    </DashboardShell>
  );
}
