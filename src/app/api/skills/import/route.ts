import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../shared/lib/auth/getSessionOrThrow";
import { logger } from "../../../../shared/lib/logger";

export async function POST(req: Request) {
  try {
    await getSessionOrThrow(req);

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "A .json file is required" },
        { status: 400 },
      );
    }

    if (file.size > 1024 * 1024) {
      return NextResponse.json(
        { error: "File must be smaller than 1MB" },
        { status: 400 },
      );
    }

    const text = await file.text();

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "File is not valid JSON" },
        { status: 400 },
      );
    }

    const obj = parsed as Record<string, unknown>;

    if (
      typeof obj.name !== "string" ||
      typeof obj.description !== "string" ||
      typeof obj.instructions !== "string"
    ) {
      return NextResponse.json(
        { error: 'JSON must contain "name", "description", and "instructions" as strings' },
        { status: 400 },
      );
    }

    // Sanitize the name to a valid slug
    const name = obj.name
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    return NextResponse.json({
      skill: {
        name,
        description: obj.description,
        instructions: obj.instructions,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    logger.error({ err }, "POST /api/skills/import failed");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
