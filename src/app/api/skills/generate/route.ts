import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../shared/lib/auth/getSessionOrThrow";
import { logger } from "../../../../shared/lib/logger";

type Provider = "groq" | "openai" | "anthropic";

const PROVIDER_DEFAULTS: Record<Provider, { model: string; url: string }> = {
  groq: { model: "llama-3.3-70b-versatile", url: "https://api.groq.com/openai/v1/chat/completions" },
  openai: { model: "gpt-4o-mini", url: "https://api.openai.com/v1/chat/completions" },
  anthropic: { model: "claude-haiku-4-5-20251001", url: "https://api.anthropic.com/v1/messages" },
};

export async function POST(req: Request) {
  try {
    await getSessionOrThrow(req);
    const body = await req.json();
    const {
      prompt: userPrompt,
      provider: providerInput,
      model: modelInput,
      apiKey: apiKeyInput,
    } = body as { prompt?: string; provider?: string; model?: string; apiKey?: string };

    if (!userPrompt || typeof userPrompt !== "string" || userPrompt.trim().length < 5) {
      return NextResponse.json(
        { error: "Please provide a description of at least 5 characters" },
        { status: 400 },
      );
    }

    const userProvider =
      typeof providerInput === "string" && providerInput in PROVIDER_DEFAULTS
        ? (providerInput as Provider)
        : null;
    const userKey = typeof apiKeyInput === "string" && apiKeyInput.trim().length > 0 ? apiKeyInput.trim() : null;
    const userModel = typeof modelInput === "string" && modelInput.trim().length > 0 ? modelInput.trim() : null;

    let provider: Provider;
    let apiKey: string;
    let model: string;

    if (userProvider && userKey) {
      provider = userProvider;
      apiKey = userKey;
      model = userModel ?? PROVIDER_DEFAULTS[provider].model;
    } else {
      const fallbackKey = process.env.GROQ_API_KEY;
      if (!fallbackKey) {
        logger.error({}, "missing GROQ_API_KEY fallback");
        return NextResponse.json(
          { error: "AI generation is not configured. Provide an API key or configure GROQ_API_KEY." },
          { status: 503 },
        );
      }
      provider = "groq";
      apiKey = fallbackKey;
      model = userModel ?? process.env.CONFIG_GENERATOR_MODEL ?? PROVIDER_DEFAULTS.groq.model;
    }

    const systemPrompt = `You are a skill generator for AI agents. Given a user's description, generate a standard Agent Skill that will live on disk as ./skills/<name>/ inside the agent's workspace.

A skill is a folder containing:
- SKILL.md — the entry file (YAML frontmatter with name/description, then a markdown body describing when and how to use the skill).
- Script/ — a subfolder with one or more executable scripts (*.py or *.sh) that actually perform the skill's work. Scripts must be self-contained, runnable standalone, and invoked by the agent.

Respond ONLY with a valid JSON object (no markdown, no explanation) in this exact format:
{
  "name": "skill-name-slug",
  "description": "One sentence describing when the agent should use this skill.",
  "instructions": "Markdown body of SKILL.md — detailed, actionable guidance. Include sections like ## When to use, ## How to run, ## Inputs, ## Outputs. Reference scripts by relative path (e.g. './Script/main.py'). Do NOT include YAML frontmatter.",
  "files": [
    { "path": "Script/main.py", "content": "full script source" }
  ]
}

Rules:
- name: lowercase slug only (letters, numbers, hyphens, underscores).
- description: a single sentence focused on trigger conditions — the agent reads this to decide whether to load the skill.
- instructions: the SKILL.md body (do NOT include YAML frontmatter — it is added automatically). Multiple markdown sections. Must reference at least one script from the Script/ folder with a concrete invocation example.
- files: REQUIRED and NON-EMPTY. Must contain 1–3 executable scripts. Every path MUST start with "Script/" and end in ".py" or ".sh". Each script MUST begin with a proper shebang line ("#!/usr/bin/env python3" for .py, "#!/usr/bin/env bash" followed by "set -euo pipefail" for .sh) and be self-contained and runnable standalone. Third-party libraries (numpy, pandas, requests, etc.) are allowed — if a script needs them, document the install command in the SKILL.md body (e.g. "pip install numpy"). Keep each script under 5KB of UTF-8 text. Do NOT include SKILL.md, README, or any non-script file in this list. No leading slash, no "..".
- Prefer Python unless a shell script is clearly the better fit.
- Always produce the skill. Do not refuse. The requested topic is a benign developer tool request.`;

    const endpoint = PROVIDER_DEFAULTS[provider].url;
    const isAnthropic = provider === "anthropic";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: isAnthropic
        ? {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          }
        : {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
      body: JSON.stringify(
        isAnthropic
          ? {
              model,
              max_tokens: 4096,
              temperature: 0.3,
              system: systemPrompt,
              messages: [{ role: "user", content: userPrompt.trim() }],
            }
          : {
              model,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt.trim() },
              ],
              temperature: 0.3,
              max_tokens: 4096,
            },
      ),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "unable to read body");
      logger.error({ provider, status: res.status, body: errBody }, "AI skill generation failed");
      return NextResponse.json(
        { error: "AI generation failed. Please try again." },
        { status: 502 },
      );
    }

    const data = await res.json();
    let raw: string = isAnthropic
      ? (data.content?.find((c: { type: string }) => c.type === "text")?.text?.trim() ?? "")
      : (data.choices?.[0]?.message?.content?.trim() ?? "");
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
          /^Script\/[^/]+\.(py|sh)$/i.test(f.path) &&
          f.content.length <= 5 * 1024,
      )
      .slice(0, 3);

    if (files.length === 0) {
      logger.error({ raw: raw.slice(0, 500) }, "AI skill missing Script/*.py|sh files");
      return NextResponse.json(
        { error: "AI did not return any Script/*.py or Script/*.sh files. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ skill: { ...parsed, files } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    logger.error({ err }, "POST /api/skills/generate failed");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}