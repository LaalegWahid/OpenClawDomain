import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../shared/lib/drizzle";
import { eq } from "drizzle-orm";
import { skill } from "../../../shared/db/schema/skill";
import { logger } from "../../../shared/lib/logger";

const SLUG_RE = /^[a-z0-9_-]+$/;

export async function GET(req: Request) {
  try {
    const session = await getSessionOrThrow(req);

    const skills = await db
      .select()
      .from(skill)
      .where(eq(skill.userId, session.user.id))
      .orderBy(skill.createdAt);

    return NextResponse.json({ skills });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logger.error({ err }, "GET /api/skills failed");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionOrThrow(req);
    const body = await req.json();
    const { name, description, instructions, source = "manual" } = body;

    if (!name || !description || !instructions) {
      return NextResponse.json(
        { error: "name, description, and instructions are required" },
        { status: 400 },
      );
    }

    if (!SLUG_RE.test(name)) {
      return NextResponse.json(
        { error: "name must be a lowercase slug (letters, numbers, hyphens, underscores)" },
        { status: 400 },
      );
    }

    if (!["manual", "ai", "import"].includes(source)) {
      return NextResponse.json({ error: "Invalid source" }, { status: 400 });
    }

    const [created] = await db
      .insert(skill)
      .values({
        userId: session.user.id,
        name,
        description,
        instructions,
        source,
      })
      .returning();

    return NextResponse.json({ skill: created }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (msg.includes("duplicate key") || msg.includes("unique constraint")) {
      return NextResponse.json(
        { error: "A skill with that name already exists" },
        { status: 409 },
      );
    }
    logger.error({ err }, "POST /api/skills failed");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
