import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../shared/lib/auth/getSessionOrThrow";
import { logger } from "../../../../shared/lib/logger";

export async function POST(req: Request) {
  try {
    await getSessionOrThrow(req);
    const body = await req.json();
    const { prompt: userPrompt } = body;

    if (!userPrompt || typeof userPrompt !== "string" || userPrompt.trim().length < 5) {
      return NextResponse.json(
        { error: "Please provide a description of at least 5 characters" },
        { status: 400 },
      );
    }

    const apiKey = process.env.OPENROUTER_CONFIG_KEY;
    if (!apiKey) {
          logger.error({ apiKey }, "missing api KEY or wrongly configured");

      return NextResponse.json(
        { error: "AI generation is not configured" },
        { status: 503 },
      );
    }

    const model = process.env.CONFIG_GENERATOR_MODEL ?? "qwen/qwen3.6-plus:free";

    const systemPrompt = `You are a skill generator for AI agents. Given a user's description, generate a bundled skill — not just a prose instruction. A skill is a folder that will live on disk as ./skills/<name>/ inside the agent's workspace, containing a SKILL.md plus any supporting files (reference material, example templates, small helper scripts) the agent may read when it decides the skill is relevant.

Respond ONLY with a valid JSON object (no markdown, no explanation) in this exact format:
{
  "name": "skill-name-slug",
  "description": "One sentence describing when the agent should use this skill (this is what the agent sees in its index to decide whether to load the skill).",
  "instructions": "The body of SKILL.md — detailed, actionable guidance the agent will read after choosing this skill. Use markdown sections. Reference supporting files by relative path (e.g. './examples/foo.md') when helpful.",
  "files": [
    { "path": "relative/path.ext", "content": "full text content of the file" }
  ]
}

Rules:
- name: lowercase slug only (letters, numbers, hyphens, underscores).
- description: a single sentence focused on trigger conditions — the agent reads this to decide whether to load the skill.
- instructions: the SKILL.md body (do NOT include YAML frontmatter — frontmatter is added automatically). At least a few sections.
- files: OPTIONAL. Include 0–5 supporting files only when they add real value (templates, reference tables, example inputs/outputs, small scripts). Do NOT include SKILL.md in this list. Each file must be plain UTF-8 text under 5KB. Paths must be relative, no leading slash, no "..".
- If no supporting files add value, return "files": [].`;

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://openclaw.ai",
        "X-Title": "OpenClaw Skill Generator",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt.trim() },
        ],
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "unable to read body");
      logger.error({ status: res.status, body: errBody }, "OpenRouter skill generation failed");
      return NextResponse.json(
        { error: "AI generation failed. Please try again." },
        { status: 502 },
      );
    }

    const data = await res.json();
    let raw: string = data.choices?.[0]?.message?.content?.trim() ?? "";
    raw = raw.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "").trim();

    let parsed: {
      name: string;
      description: string;
      instructions: string;
      files?: Array<{ path: string; content: string }>;
    };
    try {
      parsed = JSON.parse(raw);
    } catch {
      logger.error({ raw: raw.slice(0, 500) }, "Failed to parse AI skill response");
      return NextResponse.json(
        { error: "AI returned an invalid response. Please try again." },
        { status: 502 },
      );
    }

    if (!parsed.name || !parsed.description || !parsed.instructions) {
      return NextResponse.json(
        { error: "AI returned an incomplete skill definition. Please try again." },
        { status: 502 },
      );
    }

    parsed.name = parsed.name
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    const rawFiles = Array.isArray(parsed.files) ? parsed.files : [];
    const files = rawFiles
      .filter((f) => f && typeof f.path === "string" && typeof f.content === "string")
      .map((f) => ({ path: f.path.replace(/^\/+/, ""), content: f.content }))
      .filter(
        (f) =>
          f.path.length > 0 &&
          !f.path.split("/").includes("..") &&
          f.path.toUpperCase() !== "SKILL.MD" &&
          f.content.length <= 5 * 1024,
      )
      .slice(0, 5);

    return NextResponse.json({ skill: { ...parsed, files } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    logger.error({ err }, "POST /api/skills/generate failed");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
