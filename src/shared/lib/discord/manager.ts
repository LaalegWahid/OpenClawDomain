import { Client, GatewayIntentBits, Events } from "discord.js";
import { db } from "../../lib/drizzle";
import { agent, agentChannel, chatSession, agentActivity } from "../../db/schema/agent";
import { eq, and } from "drizzle-orm";
import { logger } from "../../lib/logger";
import type { ChatMessage } from "../../lib/agents/docker";
import { sendCommand, sendDocumentCommand } from "../../lib/agents/docker";
import type { AgentType } from "../../lib/agents/config";
import {
  detectDocumentRequest,
  extractFilename,
  generatePdf,
  buildDocumentSystemInstruction,
  rewriteAsContentPrompt,
  stripConversationalFiller,
  isUsableContent,
} from "../../lib/agents/document";
import { sendDiscordMessage, sendDiscordDocument } from "./bot";

const MAX_HISTORY = 20;

// ─── Active client registry ───────────────────────────────────────────────────

const clients = new Map<string, Client>();

// ─── Single bot lifecycle ─────────────────────────────────────────────────────

export async function startDiscordBot(
  agentId: string,
  token: string,
  agentType: AgentType,
): Promise<void> {
  if (clients.has(agentId)) {
    logger.warn({ agentId }, "Discord bot already running for agent, skipping");
    return;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
  });

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    const text = message.content.trim();
    if (!text) return;

    const channelId = message.channel.id;

    logger.info({ agentId, channelId, text }, "Discord message received");

    const [found] = await db.select().from(agent).where(eq(agent.id, agentId));
    if (!found) return;

    if (found.status === "stopped") {
      await sendDiscordMessage(token, channelId, "This agent has been stopped. Please restart it from the dashboard.").catch(() => {});
      return;
    }
    if (found.status === "starting" || !found.containerId) {
      await sendDiscordMessage(token, channelId, "Agent is starting up, please try again in a moment.").catch(() => {});
      return;
    }
    if (found.status === "error") {
      await sendDiscordMessage(token, channelId, "This agent encountered an error. Please check the dashboard.").catch(() => {});
      return;
    }

    // Load chat session keyed by agentId + Discord channelId
    const [session] = await db
      .select()
      .from(chatSession)
      .where(and(eq(chatSession.agentId, agentId), eq(chatSession.chatId, channelId)))
      .limit(1);

    const history: ChatMessage[] = (session?.history as ChatMessage[] | null) ?? [];
    const docFormat = detectDocumentRequest(text);

    try {
      let responseText: string;

      if (docFormat) {
        responseText = await sendDocumentCommand(
          found.containerId,
          buildDocumentSystemInstruction(agentType),
          rewriteAsContentPrompt(text),
          history,
        );
      } else {
        responseText = await sendCommand(
          found.containerId,
          text,
          history.length > 0 ? history : undefined,
          agentType,
        );
      }

      // Persist updated history
      const updatedHistory: ChatMessage[] = [
        ...history,
        { role: "user" as const, content: text },
        { role: "assistant" as const, content: responseText },
      ].slice(-MAX_HISTORY);

      if (session) {
        await db.update(chatSession).set({ history: updatedHistory }).where(eq(chatSession.id, session.id));
      } else {
        await db.insert(chatSession).values({ agentId, chatId: channelId, history: updatedHistory });
      }

      // Deliver response
      try {
        if (docFormat) {
          const filename = extractFilename(text, agentType);
          const clean = stripConversationalFiller(responseText);

          let contentSource = clean;
          if (!isUsableContent(clean)) {
            logger.warn({ agentId, contentLength: clean.length }, "Discord document response too short, falling back to history");
            const last = [...history].reverse().find((m) => m.role === "assistant");
            contentSource = last ? stripConversationalFiller(last.content) : clean;
          }

          const pdfTitle = filename.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          logger.info({ agentId, channelId, filename, contentLength: contentSource.length }, "Generating Discord PDF");

          const pdfBuffer = await generatePdf(contentSource, pdfTitle, agentType);
          await sendDiscordDocument(token, channelId, pdfBuffer, `${filename}.pdf`, "📄 Here is your document.");
          logger.info({ agentId, channelId, filename }, "Discord document sent");
        } else {
          await sendDiscordMessage(token, channelId, responseText);
        }
      } catch (err) {
        logger.error({ agentId, channelId, err }, "Failed to deliver Discord response");
        await db.insert(agentActivity).values({
          agentId,
          type: "error",
          message: `Failed to deliver to Discord channel ${channelId}: ${err instanceof Error ? err.message : "Unknown"}`,
        });
      }
    } catch (err) {
      logger.error({ agentId, err }, "Failed to reach agent container from Discord");
      const isTimeout = err instanceof Error && err.name === "TimeoutError";
      await sendDiscordMessage(
        token,
        channelId,
        isTimeout
          ? "⏳ Your request is taking longer than expected. Please try again in a moment."
          : "🚀 The agent is warming up and will be ready shortly. Please send your message again in a few seconds!",
      ).catch(() => {});
    }
  });

  client.once(Events.ClientReady, (c) => {
    logger.info({ agentId, tag: c.user.tag }, `Discord bot started for agent ${agentId} on startup`);
  });

  client.on("error", (err) => {
    logger.error({ agentId, err }, "Discord client error");
  });

  await client.login(token);
  clients.set(agentId, client);

  // Evict any container still holding this Discord token.
  // Fires on both startup (via initAllDiscordBots) and live connect (via channels/route.ts).
  const [agentRecord] = await db
    .select({ containerId: agent.containerId })
    .from(agent)
    .where(eq(agent.id, agentId))
    .limit(1);
  if (agentRecord?.containerId) {
    evictContainerDiscordIfNeeded(agentId, agentRecord.containerId);
  }
}

export async function stopDiscordBot(agentId: string): Promise<void> {
  const client = clients.get(agentId);
  if (!client) return;

  try {
    await client.destroy();
    logger.info({ agentId }, "Discord bot stopped");
  } catch (err) {
    logger.warn({ agentId, err }, "Error destroying Discord client");
  } finally {
    clients.delete(agentId);
  }
}

// ─── Startup initialiser ──────────────────────────────────────────────────────

/**
 * Checks whether a running container has DISCORD_BOT_TOKEN in its environment
 * (i.e. it was launched before Next.js took over Discord ownership). If so,
 * relaunches it — the updated launchContainer no longer passes that token, so
 * the container starts clean and stops competing for the Discord WebSocket.
 *
 * Only runs in LOCAL_DEV mode; on ECS the task definition never included the
 * token after the code change, so tasks launched after the deploy are already clean.
 */
async function evictContainerDiscordIfNeeded(agentId: string, containerId: string): Promise<void> {
  if (process.env.LOCAL_DEV !== "true") return;

  try {
    const Dockerode = (await import("dockerode")).default;
    const docker = new Dockerode();
    const info = await docker.getContainer(containerId).inspect();
    const hasToken = (info.Config.Env ?? []).some((e: string) => e.startsWith("DISCORD_BOT_TOKEN="));

    if (!hasToken) return; // Already clean — nothing to do

    logger.info({ agentId, containerId }, "Container has DISCORD_BOT_TOKEN — relaunching to evict it");
    const { relaunchAgentWithChannels } = await import("../agents/relaunch");
    relaunchAgentWithChannels(agentId).catch((err) =>
      logger.error({ agentId, err }, "Container relaunch for Discord eviction failed"),
    );
  } catch {
    // Container may not exist or inspection failed — not critical
  }
}

export async function initAllDiscordBots(): Promise<void> {
  logger.info("Initialising Discord bots from DB...");

  const discordChannels = await db
    .select({
      agentId: agentChannel.agentId,
      containerId: agent.containerId,
      credentials: agentChannel.credentials,
      agentType: agent.type,
    })
    .from(agentChannel)
    .innerJoin(agent, eq(agentChannel.agentId, agent.id))
    .where(and(eq(agentChannel.platform, "discord"), eq(agent.status, "active")));

  logger.info({ count: discordChannels.length }, "Found Discord channels to initialise");

  for (const row of discordChannels) {
    const creds = row.credentials as Record<string, string>;
    if (!creds?.botToken) {
      logger.warn({ agentId: row.agentId }, "Discord channel record has no botToken, skipping");
      continue;
    }

    try {
      await startDiscordBot(row.agentId, creds.botToken, row.agentType as AgentType);
    } catch (err) {
      logger.error({ agentId: row.agentId, err }, "Failed to start Discord bot on init");
    }
  }

  logger.info("Discord bot initialisation complete");
}
