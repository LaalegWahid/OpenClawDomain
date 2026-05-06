import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../shared/lib/auth/getSessionOrThrow";
import { getModelsCatalog } from "../../../shared/lib/models/catalog";
import { logger } from "../../../shared/lib/logger";

export async function GET(req: Request) {
  try {
    await getSessionOrThrow(req);
    const catalog = await getModelsCatalog();
    return NextResponse.json(catalog);
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error({ err }, "GET /api/models failed");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
