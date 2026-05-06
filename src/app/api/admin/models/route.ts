import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../../shared/lib/drizzle";
import { aiModel } from "../../../../shared/db/schema/ai-model";
import { listModels } from "../../../../shared/lib/models/catalog";
import { logger } from "../../../../shared/lib/logger";

function requireAdmin(role: string | null | undefined) {
  if (role !== "admin") {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getSessionOrThrow(req);
    requireAdmin(session.user.role);
    const models = await listModels();
    return NextResponse.json({ models });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error({ err }, "GET /api/admin/models failed");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionOrThrow(req);
    requireAdmin(session.user.role);
    const body = await req.json();

    // Bulk import: { catalog: { provider: string[] }, replace?: boolean }
    if (body && typeof body.catalog === "object" && body.catalog !== null) {
      const replace = body.replace === true;
      const rows: { provider: string; name: string }[] = [];
      for (const [provider, names] of Object.entries(body.catalog)) {
        const p = typeof provider === "string" ? provider.trim() : "";
        if (!p) continue;
        if (!Array.isArray(names)) continue;
        for (const n of names) {
          if (typeof n === "string" && n.trim()) {
            rows.push({ provider: p, name: n.trim() });
          }
        }
      }
      if (rows.length === 0) {
        return NextResponse.json({ error: "Empty catalog" }, { status: 400 });
      }
      if (replace) {
        await db.delete(aiModel);
      }
      await db.insert(aiModel).values(rows).onConflictDoNothing();
      const models = await listModels();
      return NextResponse.json({ ok: true, inserted: rows.length, models });
    }

    // Single add: { provider, name }
    const provider = typeof body.provider === "string" ? body.provider.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!provider) return NextResponse.json({ error: "Provider is required" }, { status: 400 });
    if (!name) return NextResponse.json({ error: "Model name is required" }, { status: 400 });

    const [created] = await db
      .insert(aiModel)
      .values({ provider, name })
      .onConflictDoNothing()
      .returning();
    if (!created) {
      return NextResponse.json({ error: "Model already exists" }, { status: 409 });
    }
    return NextResponse.json({ ok: true, model: created }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error({ err }, "POST /api/admin/models failed");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
