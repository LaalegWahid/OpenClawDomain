import { NextRequest, NextResponse } from "next/server";
import { getDomainConfig, isValidAgentType } from "../../../shared/lib/agents/config";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { domain } = body;

    if (!domain || !isValidAgentType(domain)) {
      return NextResponse.json({ error: "domain is required and must be a valid slug" }, { status: 400 });
    }

    const config = await getDomainConfig(domain);

    return NextResponse.json({ config });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}