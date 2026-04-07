import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../shared/lib/auth/getSessionOrThrow";
import { logger } from "../../../../shared/lib/logger";

/**
 * Parse YAML-style frontmatter from a SKILL.md file.
 * Expects format:
 * ---
 * name: my-skill
 * description: One line description
 * ...
 * ---
 * # Markdown body (used as instructions)
 */
function parseFrontmatter(text: string): {
  meta: Record<string, string>;
  body: string;
} {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { meta: {}, body: text.trim() };
  }

  const rawYaml = match[1];
  const body = match[2].trim();

  // Simple key: value parser (no nested YAML needed)
  const meta: Record<string, string> = {};
  for (const line of rawYaml.split("\n")) {
    const kv = line.match(/^(\w[\w-]*):\s*(.+)$/);
    if (kv) {
      meta[kv[1].trim()] = kv[2].trim().replace(/^["']|["']$/g, "");
    }
  }

  return { meta, body };
}

export async function POST(req: Request) {
  try {
    await getSessionOrThrow(req);

    const formData = await req.formData();
    const skillMd = formData.get("skillMd");
    const scriptFile = formData.get("script");

    if (!skillMd || !(skillMd instanceof Blob)) {
      return NextResponse.json(
        { error: "A SKILL.md file is required" },
        { status: 400 },
      );
    }

    if (skillMd.size > 1024 * 1024) {
      return NextResponse.json(
        { error: "SKILL.md must be smaller than 1MB" },
        { status: 400 },
      );
    }

    // Parse SKILL.md
    const mdText = await skillMd.text();
    const { meta, body } = parseFrontmatter(mdText);

    const name = meta.name;
    const description = meta.description;

    if (!name) {
      return NextResponse.json(
        { error: "SKILL.md frontmatter must contain a 'name' field" },
        { status: 400 },
      );
    }

    if (!description) {
      return NextResponse.json(
        { error: "SKILL.md frontmatter must contain a 'description' field" },
        { status: 400 },
      );
    }

    if (!body) {
      return NextResponse.json(
        { error: "SKILL.md must contain instructions in the markdown body (after the --- frontmatter)" },
        { status: 400 },
      );
    }

    // Sanitize name to a valid slug
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    // Validate .py script if provided
    let scriptName: string | null = null;
    let scriptSize = 0;
    if (scriptFile && scriptFile instanceof Blob) {
      const f = scriptFile as File;
      if (!f.name.endsWith(".py")) {
        return NextResponse.json(
          { error: "Script file must be a .py Python file" },
          { status: 400 },
        );
      }
      if (f.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Script file must be smaller than 5MB" },
          { status: 400 },
        );
      }
      scriptName = f.name;
      scriptSize = f.size;
    }

    return NextResponse.json({
      skill: {
        name: slug,
        description,
        instructions: body,
      },
      script: scriptName
        ? { name: scriptName, size: scriptSize }
        : null,
      meta,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    logger.error({ err }, "POST /api/skills/import failed");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
