import { getCurrentUser } from "../../../feature/overview/actions/user.actions";
import { ChatPageContent } from "@/feature/chat/components/chat-page-content";

export default async function OverviewPage() {
  const user = await getCurrentUser();

  return (
    <ChatPageContent/>
  );
}
