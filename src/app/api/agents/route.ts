import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../shared/lib/auth/getSessionOrThrow";
import { isValidAgentType, type AgentType } from "../../../shared/lib/agents/config";
import { db } from "../../../shared/lib/drizzle";
import { eq } from "drizzle-orm";
import { deleteWebhook, setWebhook, validateBotToken } from "../../../shared/lib/telegram/bot";
import { agent, agentActivity, agentChannel } from "../../../shared/db/schema/agent";
import { skill, agentSkill } from "../../../shared/db/schema/skill";
import { and, inArray } from "drizzle-orm";

import { launchContainer, stopContainer, waitForTaskRunning } from "../../../shared/lib/agents/docker";
import { startDiscordBot } from "../../../shared/lib/discord/manager";
import { logger } from "../../../shared/lib/logger";
import { env } from "../../../shared/config/env";
import { encryptIfPresent, decryptIfPresent } from "../../../shared/lib/crypto";

async function linkSkillsToAgent(agentId: string, userId: string, skillIds?: string[]) {
  if (!skillIds || skillIds.length === 0) return;
  const owned = await db
    .select({ id: skill.id })
    .from(skill)
    .where(and(eq(skill.userId, userId), inArray(skill.id, skillIds)));
  const ownedIds = owned.map((s) => s.id);
  if (ownedIds.length > 0) {
    await db.insert(agentSkill).values(
      ownedIds.map((skillId) => ({ agentId, skillId })),
    );
  }
}

/**
 * Extracts and encrypts the single per-agent API key from the request body.
 * Fields: apiProvider ("anthropic", "mistral", …), apiKey (the secret), agentModel.
 */
function extractEncryptedKeys(body: Record<string, unknown>) {
  return {
    apiProvider: (body.apiProvider as string | undefined)?.trim().toLowerCase() || null,
    apiKey: encryptIfPresent(body.apiKey as string | undefined),
    agentModel: (body.agentModel as string | undefined)?.trim() || null,
  };
}

export async function POST(req: Request) {
  try {
    const session = await getSessionOrThrow(req);

    const body = await req.json();
    const { platform = "telegram", name, systemPrompt, type, skillIds, profileImage } = body;

    if (!name || !systemPrompt || !type) {
      return NextResponse.json(
        { error: "name, systemPrompt, and type are required" },
        { status: 400 },
      );
    }

    if (!isValidAgentType(type)) {
      return NextResponse.json(
        { error: "Invalid agent type. Must be a non-empty description (1–60 characters, no control characters)." },
        { status: 400 },
      );
    }

    if (!["telegram", "discord", "whatsapp"].includes(platform)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }

    // Encrypt any per-agent API keys from the request body
    const encryptedKeys = extractEncryptedKeys(body);

    // Decrypted key to inject into the container at launch
    const apiKeys = {
      apiProvider: encryptedKeys.apiProvider ?? undefined,
      apiKey: decryptIfPresent(encryptedKeys.apiKey),
      agentModel: encryptedKeys.agentModel ?? undefined,
    };

    // Check if user has any existing agents — first bot gets marked as primary
    const existingAgents = await db
      .select({ id: agent.id })
      .from(agent)
      .where(eq(agent.userId, session.user.id))
      .limit(1);

    const isFirstBot = existingAgents.length === 0;

    const tempAgentId = crypto.randomUUID();

    // ── TELEGRAM ─────────────────────────────────────────────────────────────
    if (platform === "telegram") {
      const { botToken, botUsername } = body;

      if (!botToken || !botUsername) {
        return NextResponse.json(
          { error: "botToken and botUsername are required for Telegram" },
          { status: 400 },
        );
      }

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

      const [existingBot] = await db
        .select()
        .from(agent)
        .where(eq(agent.botToken, botToken))
        .limit(1);

      if (existingBot) {
        return NextResponse.json({ error: "Bot already registered" }, { status: 409 });
      }

      let containerId: string;
      try {
        const result = await launchContainer(
          session.user.id,
          tempAgentId,
          type as AgentType,
          undefined,
          undefined,
          apiKeys,
        );
        containerId = result.containerId;
      } catch (err) {
        logger.error({ err }, "Failed to launch agent container");
        return NextResponse.json(
          { error: "ECS task failed to start for this agent. Check cluster logs and task definition." },
          { status: 500 },
        );
      }

      try {
        const webhookUrl = `${env.WEBHOOK_BASE_URL}/api/telegram/webhook/${tempAgentId}`;
        await setWebhook(botToken, webhookUrl, env.TELEGRAM_WEBHOOK_SECRET);
      } catch (err) {
        await stopContainer(containerId).catch(() => {});
        await deleteWebhook(botToken).catch(() => {});
        logger.error({ err }, "Failed to set webhook");
        return NextResponse.json(
          { error: "Telegram API rejected the webhook setup. Verify bot token and webhook URL." },
          { status: 500 },
        );
      }

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
            status: "starting",
            isPrimary: isFirstBot,
            containerId,
            ...encryptedKeys,
            profileImage: profileImage || null,
          })
          .returning();

        await db.insert(agentActivity).values({ agentId: newAgent.id, type: "launch", message: `${name} launched on Telegram` });
        await linkSkillsToAgent(newAgent.id, session.user.id, skillIds);

        waitForTaskRunning(containerId)
          .then(() => db.update(agent).set({ status: "active" }).where(eq(agent.id, tempAgentId)))
          .catch(async (err) => {
            logger.error({ err, agentId: tempAgentId }, "Task never reached RUNNING");
            await db.update(agent).set({ status: "error" }).where(eq(agent.id, tempAgentId));
          });

        logger.info({ agentId: newAgent.id, userId: session.user.id, platform: "telegram" }, "Agent launched");
        return NextResponse.json({ agent: newAgent }, { status: 201 });
      } catch (err) {
        await stopContainer(containerId).catch(() => {});
        await deleteWebhook(botToken).catch(() => {});
        logger.error({ err }, "Failed to save agent to database");
        return NextResponse.json(
          { error: "Database insert failed after container and webhook succeeded. Rolled back." },
          { status: 500 },
        );
      }
    }

    // ── DISCORD ───────────────────────────────────────────────────────────────
    if (platform === "discord") {
      const credentials = body.credentials as { botToken?: string } | undefined;
      if (!credentials?.botToken) {
        return NextResponse.json({ error: "credentials.botToken is required for Discord" }, { status: 400 });
      }

      const discordToken = credentials.botToken;
      const placeholderUsername = `discord_${tempAgentId.split("-")[0]}`;

      const [existingDiscordBot] = await db
        .select()
        .from(agent)
        .where(eq(agent.botToken, discordToken))
        .limit(1);

      if (existingDiscordBot) {
        return NextResponse.json({ error: "Bot already registered" }, { status: 409 });
      }

      const existingChannels = await db.select().from(agentChannel).where(eq(agentChannel.platform, "discord"));
      const tokenConflict = existingChannels.some(
        (ch) => (ch.credentials as Record<string, string>)?.botToken === discordToken,
      );
      if (tokenConflict) {
        return NextResponse.json({ error: "Bot already registered" }, { status: 409 });
      }

      let containerId: string;
      try {
        const result = await launchContainer(
          session.user.id,
          tempAgentId,
          type as AgentType,
          { discord: { botToken: discordToken } },
          undefined,
          apiKeys,
        );
        containerId = result.containerId;
      } catch (err) {
        logger.error({ err }, "Failed to launch agent container");
        return NextResponse.json(
          { error: "ECS task failed to start for this agent." },
          { status: 500 },
        );
      }

      try {
        const [newAgent] = await db
          .insert(agent)
          .values({
            id: tempAgentId,
            userId: session.user.id,
            name,
            botToken: discordToken,
            botUsername: placeholderUsername,
            systemPrompt,
            type: type as AgentType,
            status: "starting",
            isPrimary: isFirstBot,
            containerId,
            ...encryptedKeys,
            profileImage: profileImage || null,
          })
          .returning();

        await db.insert(agentChannel).values({ agentId: newAgent.id, platform: "discord", credentials: { botToken: discordToken } });
        await db.insert(agentActivity).values({ agentId: newAgent.id, type: "launch", message: `${name} launched on Discord` });
        await linkSkillsToAgent(newAgent.id, session.user.id, skillIds);

        startDiscordBot(newAgent.id, discordToken, type as AgentType)
          .catch((err) => logger.error({ err, agentId: newAgent.id }, "Failed to start Discord bot"));

        waitForTaskRunning(containerId)
          .then(() => db.update(agent).set({ status: "active" }).where(eq(agent.id, tempAgentId)))
          .catch(async (err) => {
            logger.error({ err, agentId: tempAgentId }, "Task never reached RUNNING");
            await db.update(agent).set({ status: "error" }).where(eq(agent.id, tempAgentId));
          });

        logger.info({ agentId: newAgent.id, userId: session.user.id, platform: "discord" }, "Agent launched");
        return NextResponse.json({ agent: newAgent }, { status: 201 });
      } catch (err) {
        await stopContainer(containerId).catch(() => {});
        logger.error({ err }, "Failed to save Discord agent");
        return NextResponse.json({ error: "Database insert failed. Rolled back." }, { status: 500 });
      }
    }

    // ── WHATSAPP ──────────────────────────────────────────────────────────────
    if (platform === "whatsapp") {
      const placeholderToken = `whatsapp_${tempAgentId.split("-")[0]}`;
      const placeholderUsername = `whatsapp_${tempAgentId.replace(/-/g, "").slice(0, 12)}`;

      let containerId: string;
      try {
        const result = await launchContainer(
          session.user.id,
          tempAgentId,
          type as AgentType,
          undefined,
          undefined,
          apiKeys,
        );
        containerId = result.containerId;
      } catch (err) {
        logger.error({ err }, "Failed to launch agent container");
        return NextResponse.json({ error: "ECS task failed to start for this agent." }, { status: 500 });
      }

      try {
        const [newAgent] = await db
          .insert(agent)
          .values({
            id: tempAgentId,
            userId: session.user.id,
            name,
            botToken: placeholderToken,
            botUsername: placeholderUsername,
            systemPrompt,
            type: type as AgentType,
            status: "starting",
            isPrimary: isFirstBot,
            containerId,
            ...encryptedKeys,
            profileImage: profileImage || null,
          })
          .returning();

        await db.insert(agentActivity).values({ agentId: newAgent.id, type: "launch", message: `${name} launched — link WhatsApp to activate` });
        await linkSkillsToAgent(newAgent.id, session.user.id, skillIds);

        waitForTaskRunning(containerId)
          .then(() => db.update(agent).set({ status: "active" }).where(eq(agent.id, tempAgentId)))
          .catch(async (err) => {
            logger.error({ err, agentId: tempAgentId }, "Task never reached RUNNING");
            await db.update(agent).set({ status: "error" }).where(eq(agent.id, tempAgentId));
          });

        logger.info({ agentId: newAgent.id, userId: session.user.id, platform: "whatsapp" }, "WhatsApp agent launched (pending QR link)");
        return NextResponse.json({ agent: newAgent }, { status: 201 });
      } catch (err) {
        await stopContainer(containerId).catch(() => {});
        logger.error({ err }, "Failed to save WhatsApp agent");
        return NextResponse.json({ error: "Database insert failed. Rolled back." }, { status: 500 });
      }
    }

    return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Unhandled error in POST /api/agents. Check server logs." }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getSessionOrThrow(req);

    const agents = await db
      .select()
      .from(agent)
      .where(eq(agent.userId, session.user.id));

    // Strip encrypted key column before returning to client
    const safeAgents = agents.map(({ apiKey, ...rest }) => rest);

    logger.info({ userId: session.user.id, count: agents.length }, "Agents listed");
    return NextResponse.json({ agents: safeAgents });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Unhandled error in GET /api/agents. Check server logs." }, { status: 500 });
  }
}