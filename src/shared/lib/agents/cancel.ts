import { db } from "../drizzle";
import { agentLog } from "../../db/schema";
import { eq } from "drizzle-orm";
import { abortChat } from "./docker";

/**
 * Detects user-typed cancel commands across all channels. Strips bot @mentions
 * (Telegram group chats deliver "/cancel@MyBot") before matching.
 */
export function isCancelCommand(text: string): boolean {
  const normalized = text.trim().toLowerCase().replace(/@\S+/g, "").trim();
  return normalized === "/cancel" || normalized === "/stop";
}

/**
 * Attempts to cancel the in-flight agent request for a given (agentId, chatId).
 * Aborts the in-process fetch if its controller lives on this worker, and
 * marks the associated log as aborted in the DB.
 *
 * Returns true if something was cancelled, false if nothing was running here.
 */
export async function cancelChatRequest(agentId: string, chatId: string): Promise<boolean> {
  const { aborted, logId } = abortChat(agentId, chatId);
  if (aborted && logId) {
    await db
      .update(agentLog)
      .set({ status: "aborted", completedAt: new Date() })
      .where(eq(agentLog.id, logId));
    return true;
  }
  return false;
}
