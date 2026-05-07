import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../../../shared/lib/drizzle";
import { agent, agentChannel } from "../../../../../shared/db/schema/agent";
import { eq, and } from "drizzle-orm";
import { logger } from "../../../../../shared/lib/logger";
import { validateBotToken, setWebhook } from "../../../../../shared/lib/telegram/bot";
import { env } from "../../../../../shared/config/env";
import { relaunchAgentWithChannels } from "../../../../../shared/lib/agents/relaunch";
import { startDiscordBot } from "../../../../../shared/lib/discord/manager";

const ALLOWED_PLATFORMS = ["telegram", "discord", "whatsapp"] as const;
type Platform = (typeof ALLOWED_PLATFORMS)[number];

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

    const channels = await db
      .select({
        id: agentChannel.id,
        platform: agentChannel.platform,
        enabled: agentChannel.enabled,
        createdAt: agentChannel.createdAt,
      })
      .from(agentChannel)
      .where(eq(agentChannel.agentId, id));

    return NextResponse.json({ channels });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to list channels");
    return NextResponse.json({ error: "Failed to list channels" }, { status: 500 });
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
    const { platform, credentials } = body as { platform: Platform; credentials: Record<string, string> };

    if (!ALLOWED_PLATFORMS.includes(platform)) {
      return NextResponse.json({ error: "Invalid platform. Must be: telegram, discord, whatsapp" }, { status: 400 });
    }
    if (!credentials || typeof credentials !== "object") {
      return NextResponse.json({ error: "credentials is required" }, { status: 400 });
    }

    // ── Telegram ────────────────────────────────────────────────────────────
    if (platform === "telegram") {
      if (!credentials.botToken || !credentials.botUsername) {
        return NextResponse.json({ error: "telegram requires credentials.botToken and botUsername" }, { status: 400 });
      }

      let botInfo;
      try {
        botInfo = await validateBotToken(credentials.botToken);
      } catch {
        return NextResponse.json({ error: "Invalid bot token. Please check your token from BotFather." }, { status: 400 });
      }

      if (botInfo.username.toLowerCase() !== credentials.botUsername.toLowerCase()) {
        return NextResponse.json({ error: `Bot username mismatch. Token belongs to @${botInfo.username}` }, { status: 400 });
      }

      // Cross-agent dedup: refuse if this token is already attached to another
      // agent (either as a legacy primary or as another channel record).
      const [legacyOwner] = await db
        .select({ id: agent.id })
        .from(agent)
        .where(eq(agent.botToken, credentials.botToken))
        .limit(1);
      if (legacyOwner && legacyOwner.id !== id) {
        return NextResponse.json({ error: "Bot already registered" }, { status: 409 });
      }
      const existingChannels = await db
        .select({ agentId: agentChannel.agentId, credentials: agentChannel.credentials })
        .from(agentChannel)
        .where(eq(agentChannel.platform, "telegram"));
      const tokenConflict = existingChannels.some(
        (ch) => ch.agentId !== id && (ch.credentials as Record<string, string>)?.botToken === credentials.botToken,
      );
      if (tokenConflict) {
        return NextResponse.json({ error: "Bot already registered" }, { status: 409 });
      }

      const webhookUrl = `${env.WEBHOOK_BASE_URL}/api/telegram/webhook/${id}`;
      try {
        await setWebhook(credentials.botToken, webhookUrl, env.TELEGRAM_WEBHOOK_SECRET);
      } catch {
        return NextResponse.json({ error: "Failed to set Telegram webhook. Check bot token and webhook URL." }, { status: 500 });
      }

      const [created] = await db
        .insert(agentChannel)
        .values({ agentId: id, platform: "telegram", credentials: { botToken: credentials.botToken, botUsername: botInfo.username } })
        .returning({ id: agentChannel.id, platform: agentChannel.platform, enabled: agentChannel.enabled, createdAt: agentChannel.createdAt });

      logger.info({ agentId: id, platform: "telegram", username: botInfo.username }, "Telegram channel added");

      // Relaunch so the container loads the @openclaw/telegram plugin for cron
      // delivery. Inbound webhooks are already served by Next.js.
      relaunchAgentWithChannels(id).catch((err) =>
        logger.error({ err, agentId: id, platform: "telegram" }, "Relaunch after Telegram channel add failed"),
      );

      return NextResponse.json({ channel: created }, { status: 201 });
    }

    // ── Discord ─────────────────────────────────────────────────────────────
    if (platform === "discord") {
      if (!credentials.botToken) {
        return NextResponse.json({ error: "discord requires credentials.botToken" }, { status: 400 });
      }
      // Cross-agent dedup against legacy agent.botToken and other channel rows.
      const [legacyOwner] = await db
        .select({ id: agent.id })
        .from(agent)
        .where(eq(agent.botToken, credentials.botToken))
        .limit(1);
      if (legacyOwner && legacyOwner.id !== id) {
        return NextResponse.json({ error: "Bot already registered" }, { status: 409 });
      }
      const existingDiscordChannels = await db
        .select({ agentId: agentChannel.agentId, credentials: agentChannel.credentials })
        .from(agentChannel)
        .where(eq(agentChannel.platform, "discord"));
      const dcConflict = existingDiscordChannels.some(
        (ch) => ch.agentId !== id && (ch.credentials as Record<string, string>)?.botToken === credentials.botToken,
      );
      if (dcConflict) {
        return NextResponse.json({ error: "Bot already registered" }, { status: 409 });
      }
    }

    // ── WhatsApp (legacy Twilio path — prefer QR link flow) ─────────────────
    if (platform === "whatsapp" && (!credentials.accountSid || !credentials.authToken || !credentials.fromNumber)) {
      return NextResponse.json({ error: "whatsapp requires credentials.accountSid, authToken, fromNumber" }, { status: 400 });
    }

    const [created] = await db
      .insert(agentChannel)
      .values({ agentId: id, platform, credentials })
      .returning({ id: agentChannel.id, platform: agentChannel.platform, enabled: agentChannel.enabled, createdAt: agentChannel.createdAt });

    logger.info({ agentId: id, platform }, "Channel added");

    if (platform === "discord") {
      // Next.js owns Discord — start the bot in-process instead of relaunching the container
      const agentType = found.type;
      startDiscordBot(id, credentials.botToken, agentType as import("../../../../../shared/lib/agents/config").AgentType)
        .catch((err) => logger.error({ err, agentId: id }, "Failed to start Discord bot after connect"));
    } else {
      // Relaunch the agent container so it picks up the new channel config (WhatsApp etc.)
      relaunchAgentWithChannels(id).catch((err) =>
        logger.error({ err, agentId: id, platform }, "Relaunch after channel add failed"),
      );
    }

    return NextResponse.json({ channel: created }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to add channel");
    return NextResponse.json({ error: "Failed to add channel" }, { status: 500 });
  }
}
