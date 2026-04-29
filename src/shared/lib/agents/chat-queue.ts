import { db } from "../drizzle";
import { incomingMessage } from "../../db/schema/agent";
import { logger } from "../logger";

/**
 * Per-chat work queue. Calls with the same key are serialized: each fn waits
 * for the previous fn (success or failure) before running.
 *
 * Scope: in-memory, per Node process. Sufficient for single-instance Next.js
 * deployments. Multi-instance deployments would need a Postgres advisory lock.
 */
const tails = new Map<string, Promise<unknown>>();

export function withChatQueue<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = tails.get(key) ?? Promise.resolve();
  const next = prev.then(fn, fn); // run fn even if prev rejected
  const tail = next.catch(() => undefined);
  tails.set(key, tail);
  tail.then(() => {
    if (tails.get(key) === tail) tails.delete(key);
  });
  return next;
}

/**
 * Insert the message into the dedup table. Returns true if this is a new
 * message (proceed with processing), false if it was already seen (drop it).
 *
 * Postgres unique-violation error code "23505" signals a duplicate.
 */
export async function claimIncomingMessage(args: {
  agentId: string;
  chatId: string;
  source: "telegram" | "whatsapp";
  externalId: string;
}): Promise<boolean> {
  try {
    await db.insert(incomingMessage).values(args);
    return true;
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "23505") return false;
    logger.error({ err, ...args }, "claimIncomingMessage failed");
    // On non-dedup DB errors, allow processing rather than block legitimate traffic
    return true;
  }
}
