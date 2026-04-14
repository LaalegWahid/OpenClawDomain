import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../../shared/lib/drizzle";
import { eq, and } from "drizzle-orm";
import { skill } from "../../../../shared/db/schema/skill";
import { logger } from "../../../../shared/lib/logger";

async function getOwnedSkill(req: Request, skillId: string) {
  const session = await getSessionOrThrow(req);
  const [found] = await db
    .select()
    .from(skill)
    .where(and(eq(skill.id, skillId), eq(skill.userId, session.user.id)));

  if (!found) throw new Error("NotFound");
  return { session, skill: found };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { skill: found } = await getOwnedSkill(req, id);
    return NextResponse.json({ skill: found });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "NotFound") return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    logger.error({ err }, "GET /api/skills/[id] failed");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { skill: found } = await getOwnedSkill(req, id);
    const body = await req.json();

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) {
      if (!/^[a-z0-9_-]+$/.test(body.name)) {
        return NextResponse.json({ error: "Invalid name slug" }, { status: 400 });
      }
      updates.name = body.name;
    }
    if (body.description !== undefined) updates.description = body.description;
    if (body.instructions !== undefined) updates.instructions = body.instructions;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const [updated] = await db
      .update(skill)
      .set(updates)
      .where(eq(skill.id, found.id))
      .returning();

    return NextResponse.json({ skill: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "NotFound") return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    if (msg.includes("duplicate key") || msg.includes("unique constraint")) {
      return NextResponse.json({ error: "A skill with that name already exists" }, { status: 409 });
    }
    logger.error({ err }, "PATCH /api/skills/[id] failed");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { skill: found } = await getOwnedSkill(req, id);

    await db.delete(skill).where(eq(skill.id, found.id));

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "NotFound") return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    logger.error({ err }, "DELETE /api/skills/[id] failed");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
