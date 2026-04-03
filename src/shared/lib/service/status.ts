import "server-only";
import { db } from "../drizzle";
import { systemConfig } from "../../db/schema/config";
import { eq } from "drizzle-orm";

const CONFIG_ID = "default";

export async function getServiceEnabled(): Promise<boolean> {
  const [row] = await db
    .select({ serviceEnabled: systemConfig.serviceEnabled })
    .from(systemConfig)
    .where(eq(systemConfig.id, CONFIG_ID))
    .limit(1);

  // If the row doesn't exist yet the service is considered enabled
  return row?.serviceEnabled ?? true;
}

export async function setServiceEnabled(enabled: boolean): Promise<void> {
  await db
    .insert(systemConfig)
    .values({ id: CONFIG_ID, serviceEnabled: enabled, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: systemConfig.id,
      set: { serviceEnabled: enabled, updatedAt: new Date() },
    });
}
