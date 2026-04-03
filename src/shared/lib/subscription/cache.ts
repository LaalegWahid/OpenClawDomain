import { db } from "../drizzle";
import { eq } from "drizzle-orm";
import { subscription } from "../../db/schema/subscription";

export async function isSubscriptionActive(userId: string): Promise<boolean> {
  if (process.env.LOCAL_DEV === "true") return true;
  const [sub] = await db
    .select({ status: subscription.status })
    .from(subscription)
    .where(eq(subscription.userId, userId));

  return sub?.status === "active";
}

export async function invalidateSubscriptionCache(_userId: string) {
  // no-op until Redis is added back
}