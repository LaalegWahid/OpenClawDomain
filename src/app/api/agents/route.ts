import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../shared/lib/auth/getSessionOrThrow";
import { AGENT_TYPES, AgentType } from "../../../shared/lib/agents/config";
import { db } from "../../../shared/lib/drizzle";
import { eq } from "drizzle-orm";
import { deleteWebhook, setWebhook, validateBotToken } from "../../../shared/lib/telegram/bot";
import { agent, agentActivity } from "../../../shared/db/schema";
import { launchContainer, stopContainer } from "../../../shared/lib/agents/docker";
import { logger } from "../../../shared/lib/logger";
import { env } from "../../../shared/config/env";

const MAX_BOTS_PER_USER = 3;

export async function POST(req: Request) {
  try {
    const session = await getSessionOrThrow(req);
    const { botToken, botUsername, name, systemPrompt, type } = await req.json();

    if (!botToken || !botUsername || !name || !systemPrompt || !type) {
      return NextResponse.json(
        { error: "botToken, botUsername, name, systemPrompt, and type are required" },
        { status: 400 },
      );
    }

    if (!AGENT_TYPES.includes(type as AgentType)) {
      return NextResponse.json(
        { error: `Invalid agent type. Must be one of: ${AGENT_TYPES.join(", ")}` },
        { status: 400 },
      );
    }

    // Check bot cap
    const existingAgents = await db
      .select()
      .from(agent)
      .where(eq(agent.userId, session.user.id))
      .then((rows) => rows.filter((r) => r.status !== "stopped"));

    if (existingAgents.length >= MAX_BOTS_PER_USER) {
      return NextResponse.json(
        { error: "Maximum 3 bots reached" },
        { status: 403 },
      );
    }

    // Validate bot token with Telegram
    let botInfo;
    try {
      botInfo = await validateBotToken(botToken);
    } catch {
      return NextResponse.json(
        { error: "Invalid bot token. Please check your token from BotFather." },
        { status: 400 },
      );
    }

    if (botInfo.username.toLowerCase() !== botUsername.toLowerCase()) {
      return NextResponse.json(
        { error: `Bot username mismatch. Token belongs to @${botInfo.username}` },
        { status: 400 },
      );
    }

    // Check uniqueness
    const [existingBot] = await db
      .select()
      .from(agent)
      .where(eq(agent.botToken, botToken))
      .limit(1);

    if (existingBot) {
      return NextResponse.json(
        { error: "Bot already registered" },
        { status: 409 },
      );
    }

    // Generate a temporary agent ID for the container data dir
    const tempAgentId = crypto.randomUUID();

    // Step 1: Launch Docker container FIRST — if this fails, nothing is persisted
    let containerId: string;
    let port: number;
    try {
      const result = await launchContainer(
        session.user.id,
        tempAgentId,
        systemPrompt,
        type as AgentType,
      );
      containerId = result.containerId;
      port = result.port;
    } catch (err) {
      logger.error({ err }, "Failed to launch agent container");
      return NextResponse.json(
        { error: "Failed to launch agent container" },
        { status: 500 },
      );
    }

    // Step 2: Set webhook — if this fails, stop the container and bail
    try {
      const webhookUrl = `${env.WEBHOOK_BASE_URL}/api/telegram/webhook/${tempAgentId}`;
      await setWebhook(botToken, webhookUrl);
    } catch (err) {
      // Rollback: stop the container we just started
      await stopContainer(containerId).catch(() => {});
      logger.error({ err }, "Failed to set webhook");
      return NextResponse.json(
        { error: "Failed to set Telegram webhook" },
        { status: 500 },
      );
    }

    // Step 3: Everything succeeded — now persist to DB
    try {
      const [newAgent] = await db
        .insert(agent)
        .values({
          id: tempAgentId,
          userId: session.user.id,
          name,
          botToken,
          botUsername: botInfo.username,
          systemPrompt,
          type: type as AgentType,
          status: "active",
          containerId,
        })
        .returning();

      await db.insert(agentActivity).values({
        agentId: newAgent.id,
        type: "launch",
        message: `${name} launched successfully`,
      });

      logger.info({ agentId: newAgent.id, userId: session.user.id }, "Agent launched");
      return NextResponse.json({ agent: newAgent }, { status: 201 });
    } catch (err) {
      // Rollback: stop container and remove webhook
      await stopContainer(containerId).catch(() => {});
      await deleteWebhook(botToken).catch(() => {});
      logger.error({ err }, "Failed to save agent to database");
      return NextResponse.json(
        { error: "Failed to save agent" },
        { status: 500 },
      );
    }
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getSessionOrThrow(req);

    const agents = await db
      .select()
      .from(agent)
      .where(eq(agent.userId, session.user.id));

    logger.info({ userId: session.user.id, count: agents.length }, "Agents listed");
    return NextResponse.json({ agents });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
