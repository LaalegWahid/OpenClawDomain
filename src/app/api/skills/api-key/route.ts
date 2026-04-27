import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSessionOrThrow } from "../../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../../shared/lib/drizzle";
import { skillApiKey } from "../../../../shared/db/schema/skill";
import { logger } from "../../../../shared/lib/logger";

const SUPPORTED_PROVIDERS = new Set(["anthropic", "openai", "openrouter", "google"]);

export async function GET(req: Request) {
  try {
    const session = await getSessionOrThrow(req);
    const [row] = await db
      .select({
        apiProvider: skillApiKey.apiProvider,
        agentModel: skillApiKey.agentModel,
      })
      .from(skillApiKey)
      .where(eq(skillApiKey.userId, session.user.id));

    if (!row) {
      return NextResponse.json({ hasKey: false });
    }
    return NextResponse.json({
      hasKey: true,
      provider: row.apiProvider,
      model: row.agentModel,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    logger.error({ err }, "GET /api/skills/api-key failed");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionOrThrow(req);
    const body = await req.json();
    const provider = typeof body.provider === "string" ? body.provider.trim() : "";
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    const model = typeof body.model === "string" ? body.model.trim() : "";

    if (!provider || !SUPPORTED_PROVIDERS.has(provider)) {
      return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 });
    }
    if (!model) {
      return NextResponse.json({ error: "Model is required" }, { status: 400 });
    }

    await db
      .insert(skillApiKey)
      .values({
        userId: session.user.id,
        apiProvider: provider,
        apiKey,
        agentModel: model,
      })
      .onConflictDoUpdate({
        target: skillApiKey.userId,
        set: {
          apiProvider: provider,
          apiKey,
          agentModel: model,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ ok: true, provider, model });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    logger.error({ err }, "POST /api/skills/api-key failed");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSessionOrThrow(req);
    await db.delete(skillApiKey).where(eq(skillApiKey.userId, session.user.id));
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    logger.error({ err }, "DELETE /api/skills/api-key failed");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
