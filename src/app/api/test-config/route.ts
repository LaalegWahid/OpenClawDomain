import { NextRequest, NextResponse } from "next/server";
import { getDomainConfig, isValidAgentType } from "../../../shared/lib/agents/config";

/**
 * GET /api/test-config?type=education
 * POST /api/test-config  { "type": "education" }
 *
 * Returns the generated DomainConfig for any agent type.
 * Legacy types (finance, marketing, operations) return instantly.
 * Custom types trigger OpenRouter generation on first call, then are cached.
 */

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");

  if (!type || !isValidAgentType(type)) {
    return NextResponse.json(
      { error: "Provide ?type= with a valid slug (e.g. finance, education, cybersecurity)" },
      { status: 400 },
    );
  }

  try {
    const start = Date.now();
    const config = await getDomainConfig(type);
    const elapsed = Date.now() - start;

    return NextResponse.json({
      type: type.trim().toLowerCase(),
      elapsed_ms: elapsed,
      config,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type } = body;

    if (!type || !isValidAgentType(type)) {
      return NextResponse.json(
        { error: "Provide { \"type\": \"...\" } with a valid slug" },
        { status: 400 },
      );
    }

    const start = Date.now();
    const config = await getDomainConfig(type);
    const elapsed = Date.now() - start;

    return NextResponse.json({
      type: type.trim().toLowerCase(),
      elapsed_ms: elapsed,
      config,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
