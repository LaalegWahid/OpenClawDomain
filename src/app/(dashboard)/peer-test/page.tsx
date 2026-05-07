import { PeerTestContent } from "../../../feature/peer-test/components/peer-test-content";
import { getCurrentUser } from "../../../feature/overview/actions/user.actions";

export default async function PeerTestPage() {
  await getCurrentUser();
  return <PeerTestContent />;
}
