import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSessionOrThrow } from "../../../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../../../shared/lib/drizzle";
import { aiModel } from "../../../../../shared/db/schema/ai-model";
import { logger } from "../../../../../shared/lib/logger";

function requireAdmin(role: string | null | undefined) {
  if (role !== "admin") {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionOrThrow(req);
    requireAdmin(session.user.role);
    const { id } = await params;
    const body = await req.json();

    const updates: { provider?: string; name?: string } = {};
    if (typeof body.provider === "string" && body.provider.trim()) {
      updates.provider = body.provider.trim();
    }
    if (typeof body.name === "string" && body.name.trim()) {
      updates.name = body.name.trim();
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const [updated] = await db
      .update(aiModel)
      .set(updates)
      .where(eq(aiModel.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, model: updated });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("duplicate key") || msg.includes("unique constraint")) {
      return NextResponse.json(
        { error: "A model with that provider and name already exists" },
        { status: 409 },
      );
    }
    logger.error({ err }, "PATCH /api/admin/models/[id] failed");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionOrThrow(req);
    requireAdmin(session.user.role);
    const { id } = await params;

    const [deleted] = await db
      .delete(aiModel)
      .where(eq(aiModel.id, id))
      .returning({ id: aiModel.id });

    if (!deleted) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error({ err }, "DELETE /api/admin/models/[id] failed");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
