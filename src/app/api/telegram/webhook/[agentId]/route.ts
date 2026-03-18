import { NextResponse } from "next/server";
import { db } from "@/shared/lib/drizzle";
import { agent, agentActivity } from "@/shared/db/schema/agent";
import { eq } from "drizzle-orm";
import { sendMessage } from "@/shared/lib/telegram/bot";
import { sendCommand } from "@/shared/lib/agents/docker";
import { logger } from "@/shared/lib/logger";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await params;

  // Look up agent
  const [found] = await db
    .select()
    .from(agent)
    .where(eq(agent.id, agentId));

  if (!found) {
    return NextResponse.json({ ok: true }); // silently ignore unknown agents
  }

  const body = await req.json();
  const message = body?.message;

  if (!message?.text) {
    return NextResponse.json({ ok: true });
  }

  const chatId = String(message.chat.id);
  const text = message.text.trim();

  logger.info({ agentId, chatId, text }, "Webhook message received");

  // Agent stopped
  if (found.status === "stopped") {
    try {
      await sendMessage(found.botToken, chatId, "This agent has been stopped. Please restart it from the dashboard.");
    } catch (err) {
      logger.error({ agentId, err }, "Failed to send stopped message");
    }
    return NextResponse.json({ ok: true });
  }

  // Agent starting
  if (found.status === "starting" || !found.containerPort) {
    try {
      await sendMessage(found.botToken, chatId, "Agent is starting up, try again shortly.");
    } catch (err) {
      logger.error({ agentId, err }, "Failed to send starting message");
    }
    return NextResponse.json({ ok: true });
  }

  // Agent errored
  if (found.status === "error") {
    try {
      await sendMessage(found.botToken, chatId, "This agent encountered an error. Please check the dashboard.");
    } catch (err) {
      logger.error({ agentId, err }, "Failed to send error message");
    }
    return NextResponse.json({ ok: true });
  }

  // Forward to container
  try {
    const response = await sendCommand(found.containerPort, text);

    try {
      await sendMessage(found.botToken, chatId, response);
    } catch (err) {
      // User may have blocked the bot
      logger.error({ agentId, chatId, err }, "Failed to send response to user");
      await db.insert(agentActivity).values({
        agentId,
        type: "error",
        message: `Failed to send message to chat ${chatId}: ${err instanceof Error ? err.message : "Unknown"}`,
      });
    }
  } catch (err) {
    logger.error({ agentId, err }, "Failed to reach agent container");

    const isTimeout = err instanceof Error && err.name === "TimeoutError";
    const userMessage = isTimeout
      ? "Processing took too long, please try again."
      : "Failed to reach the agent. It may be starting up — try again shortly.";

    try {
      await sendMessage(found.botToken, chatId, userMessage);
    } catch (sendErr) {
      logger.error({ agentId, sendErr }, "Failed to send error message to user");
    }
  }

  return NextResponse.json({ ok: true });
}
