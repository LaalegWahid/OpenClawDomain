import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "../../../../shared/lib/drizzle";
import { incomingMessage } from "../../../../shared/db/schema/agent";
import { logger } from "../../../../shared/lib/logger";
import { env } from "../../../../shared/config/env";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await db
    .delete(incomingMessage)
    .where(sql`${incomingMessage.createdAt} < NOW() - INTERVAL '1 day'`);

  const deleted = result.rowCount ?? 0;
  logger.info({ deleted }, "incoming_message cleanup");
  return NextResponse.json({ deleted });
}
