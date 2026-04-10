import { BillingContent } from "@/feature/subscription/components/billing-content";
import { getCurrentUser } from "@/feature/overview/actions/user.actions";

export default async function BillingPage() {
  const user = await getCurrentUser();

  return (
    <BillingContent />
  );
}
