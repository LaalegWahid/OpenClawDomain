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

    const systemPrompt = `You are a skill generator for AI agents. Given a user's description, generate a single skill definition.

Respond ONLY with a valid JSON object (no markdown, no explanation) in this exact format:
{
  "name": "skill-name-slug",
  "description": "One sentence describing what this skill enables the agent to do.",
  "instructions": "Detailed instructions for the agent on how to use this skill. Include what the agent should know, how it should behave when this skill is activated, and any specific guidelines or constraints."
}

The name must be a lowercase slug (letters, numbers, hyphens, underscores only).
The instructions should be thorough and actionable (at least 2-3 sentences).`;

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

    let parsed: { name: string; description: string; instructions: string };
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

    // Sanitize the name to a valid slug
    parsed.name = parsed.name
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    return NextResponse.json({ skill: parsed });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    logger.error({ err }, "POST /api/skills/generate failed");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
