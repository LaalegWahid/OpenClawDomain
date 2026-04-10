import { SettingsContent } from "../../../feature/settings/components/settings-content";
import { getCurrentUser } from "../../../feature/overview/actions/user.actions";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <SettingsContent userName={user?.name} userEmail={user?.email} />
  );
}
