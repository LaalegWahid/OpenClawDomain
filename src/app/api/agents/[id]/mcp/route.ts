import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../../../shared/lib/drizzle";
import { agent, agentMcp } from "../../../../../shared/db/schema/agent";
import { eq, and } from "drizzle-orm";
import { logger } from "../../../../../shared/lib/logger";

const ALLOWED_TRANSPORTS = ["stdio", "http"] as const;

// Allowlisted stdio packages to prevent arbitrary code execution
const ALLOWED_STDIO_COMMANDS = ["npx", "node", "python3", "python", "uvx"];

function validateMcpConfig(transport: string, config: Record<string, unknown>): string | null {
  if (!ALLOWED_TRANSPORTS.includes(transport as "stdio" | "http")) {
    return "transport must be: stdio or http";
  }
  if (transport === "stdio") {
    if (!config.command || typeof config.command !== "string") return "stdio requires config.command";
    if (!ALLOWED_STDIO_COMMANDS.includes(config.command)) {
      return `stdio command must be one of: ${ALLOWED_STDIO_COMMANDS.join(", ")}`;
    }
  }
  if (transport === "http") {
    if (!config.url || typeof config.url !== "string") return "http requires config.url";
    try { new URL(config.url as string); } catch { return "config.url must be a valid URL"; }
  }
  return null;
}

async function getOwnedAgent(req: Request, agentId: string) {
  const session = await getSessionOrThrow(req);
  const [found] = await db
    .select()
    .from(agent)
    .where(and(eq(agent.id, agentId), eq(agent.userId, session.user.id)));
  return found ?? null;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const found = await getOwnedAgent(req, id);
    if (!found) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const servers = await db
      .select({
        id: agentMcp.id,
        serverName: agentMcp.serverName,
        transport: agentMcp.transport,
        config: agentMcp.config,
        enabled: agentMcp.enabled,
        createdAt: agentMcp.createdAt,
      })
      .from(agentMcp)
      .where(eq(agentMcp.agentId, id));

    return NextResponse.json({ servers });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to list MCP servers");
    return NextResponse.json({ error: "Failed to list MCP servers" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const found = await getOwnedAgent(req, id);
    if (!found) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const body = await req.json();
    const { serverName, transport, config } = body as {
      serverName: string;
      transport: string;
      config: Record<string, unknown>;
    };

    if (!serverName || typeof serverName !== "string") {
      return NextResponse.json({ error: "serverName is required" }, { status: 400 });
    }

    const validationError = validateMcpConfig(transport, config ?? {});
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // Check per-agent server limit
    const existing = await db
      .select({ id: agentMcp.id })
      .from(agentMcp)
      .where(eq(agentMcp.agentId, id));

    if (existing.length >= 10) {
      return NextResponse.json({ error: "Maximum 10 MCP servers per agent" }, { status: 429 });
    }

    const [created] = await db
      .insert(agentMcp)
      .values({ agentId: id, serverName, transport, config })
      .returning();

    logger.info({ agentId: id, serverName, transport }, "MCP server added");
    return NextResponse.json({ server: created }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to add MCP server");
    return NextResponse.json({ error: "Failed to add MCP server" }, { status: 500 });
  }
}
