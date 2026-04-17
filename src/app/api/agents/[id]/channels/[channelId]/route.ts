import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../../../../shared/lib/drizzle";
import { agent, agentChannel } from "../../../../../../shared/db/schema/agent";
import { eq, and } from "drizzle-orm";
import { logger } from "../../../../../../shared/lib/logger";
import { relaunchAgentWithChannels } from "../../../../../../shared/lib/agents/relaunch";
import { startDiscordBot, stopDiscordBot } from "../../../../../../shared/lib/discord/manager";
import { setWebhook, deleteWebhook } from "../../../../../../shared/lib/telegram/bot";
import { env } from "../../../../../../shared/config/env";
import type { AgentType } from "../../../../../../shared/lib/agents/config";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; channelId: string }> },
) {
  try {
    const session = await getSessionOrThrow(req);
    const { id, channelId } = await params;

    const [found] = await db
      .select()
      .from(agent)
      .where(and(eq(agent.id, id), eq(agent.userId, session.user.id)));

    if (!found) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const [deleted] = await db
      .delete(agentChannel)
      .where(and(eq(agentChannel.id, channelId), eq(agentChannel.agentId, id)))
      .returning({ platform: agentChannel.platform, credentials: agentChannel.credentials });

    logger.info({ agentId: id, channelId, platform: deleted?.platform }, "Channel deleted");

    if (deleted?.platform === "telegram") {
      const creds = deleted.credentials as Record<string, string> | null;
      if (creds?.botToken) {
        deleteWebhook(creds.botToken).catch((err) =>
          logger.warn({ err, agentId: id }, "Failed to delete Telegram webhook"),
        );
      }
    } else if (deleted?.platform === "discord") {
      // Next.js owns Discord — stop the in-process bot, no container relaunch needed
      await stopDiscordBot(id);
    } else {
      // Relaunch so the removed channel is no longer active in openclaw.json
      relaunchAgentWithChannels(id).catch((err) =>
        logger.error({ err, agentId: id, channelId }, "Relaunch after channel delete failed"),
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to delete channel");
    return NextResponse.json({ error: "Failed to delete channel" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; channelId: string }> },
) {
  try {
    const session = await getSessionOrThrow(req);
    const { id, channelId } = await params;

    const [found] = await db
      .select()
      .from(agent)
      .where(and(eq(agent.id, id), eq(agent.userId, session.user.id)));

    if (!found) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const body = await req.json();
    const { enabled } = body as { enabled?: boolean };
    if (typeof enabled !== "boolean") {
      return NextResponse.json({ error: "enabled must be boolean" }, { status: 400 });
    }

    const [updated] = await db
      .update(agentChannel)
      .set({ enabled })
      .where(and(eq(agentChannel.id, channelId), eq(agentChannel.agentId, id)))
      .returning({
        id: agentChannel.id,
        platform: agentChannel.platform,
        enabled: agentChannel.enabled,
        credentials: agentChannel.credentials,
        createdAt: agentChannel.createdAt,
      });

    if (!updated) return NextResponse.json({ error: "Channel not found" }, { status: 404 });

    logger.info({ agentId: id, channelId, platform: updated.platform, enabled }, "Channel toggled");

    const creds = updated.credentials as Record<string, string> | null;

    if (updated.platform === "telegram") {
      if (!creds?.botToken) {
        return NextResponse.json({ error: "Channel missing bot token" }, { status: 500 });
      }
      if (enabled) {
        const webhookUrl = `${env.WEBHOOK_BASE_URL}/api/telegram/webhook/${id}`;
        await setWebhook(creds.botToken, webhookUrl, env.TELEGRAM_WEBHOOK_SECRET).catch((err) => {
          logger.error({ err, agentId: id }, "Failed to re-set Telegram webhook");
        });
      } else {
        await deleteWebhook(creds.botToken).catch((err) =>
          logger.warn({ err, agentId: id }, "Failed to delete Telegram webhook"),
        );
      }
    } else if (updated.platform === "discord") {
      if (enabled) {
        if (!creds?.botToken) {
          return NextResponse.json({ error: "Channel missing bot token" }, { status: 500 });
        }
        startDiscordBot(id, creds.botToken, found.type as AgentType).catch((err) =>
          logger.error({ err, agentId: id }, "Failed to start Discord bot on enable"),
        );
      } else {
        await stopDiscordBot(id);
      }
    } else {
      // WhatsApp — relaunch container so channel config is picked up fresh
      relaunchAgentWithChannels(id).catch((err) =>
        logger.error({ err, agentId: id, channelId }, "Relaunch after channel toggle failed"),
      );
    }

    return NextResponse.json({
      channel: {
        id: updated.id,
        platform: updated.platform,
        enabled: updated.enabled,
        createdAt: updated.createdAt,
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to toggle channel");
    return NextResponse.json({ error: "Failed to toggle channel" }, { status: 500 });
  }
}
