import { NextResponse, after } from "next/server";
import { db } from "../../../../../shared/lib/drizzle";
import { agent, agentActivity, agentLog, chatSession } from "../../../../../shared/db/schema";
import { logger } from "../../../../../shared/lib/logger";
import { sendChatAction, sendDocument, sendMessage } from "../../../../../shared/lib/telegram/bot";
import { eq, and } from "drizzle-orm";
import { ChatMessage, sendCommand, sendDocumentCommand, registerChatAbort, cleanupChatAbort } from "../../../../../shared/lib/agents/docker";
import { isCancelCommand, cancelChatRequest } from "../../../../../shared/lib/agents/cancel";
import { AgentType } from "../../../../../shared/lib/agents/config";
import {
  detectDocumentRequest,
  extractFilename,
  generatePdf,
  buildDocumentSystemInstruction,
  rewriteAsContentPrompt,
  stripConversationalFiller,
  isUsableContent,
} from "../../../../../shared/lib/agents/document";
import { env } from "../../../../../shared/config/env";
import { getServiceEnabled } from "../../../../../shared/lib/service/status";
import { getAgentErrorMessage } from "../../../../../shared/lib/agents/errors";
import { withChatQueue, claimIncomingMessage } from "../../../../../shared/lib/agents/chat-queue";
import { enforceAgentTrialKill } from "../../../../../shared/lib/agents/trial-enforcer";

const MAX_HISTORY = 20;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { agentId } = await params;

  // Global kill-switch: drop the message silently so no tokens are consumed
  const serviceEnabled = await getServiceEnabled();
  if (!serviceEnabled) {
    logger.info({ agentId }, "Service blocked — message dropped");
    return NextResponse.json({ ok: true });
  }

  const body = await req.json();
  const message = body?.message;
  if (!message?.text) return NextResponse.json({ ok: true });

  const chatId = String(message.chat.id);
  const text = message.text.trim();
  const updateId = body?.update_id != null ? String(body.update_id) : "";

  // Dedup webhook retries by Telegram update_id. If we've already accepted
  // this update, drop it. Cancel commands and status-replies are also
  // protected so users never see duplicates of those either.
  if (updateId) {
    const claimed = await claimIncomingMessage({
      agentId,
      chatId,
      source: "telegram",
      externalId: updateId,
    });
    if (!claimed) {
      logger.info({ agentId, chatId, updateId }, "Telegram dedup: duplicate update dropped");
      return NextResponse.json({ ok: true });
    }
  }

  // Lazy trial enforcement: if this agent's 15-day kill time has passed, stop
  // it now. The status check below will then send the standard "agent has been
  // stopped" reply.
  await enforceAgentTrialKill(agentId).catch((err) => {
    logger.warn({ err, agentId }, "Trial kill check failed");
  });

  const [found] = await db.select().from(agent).where(eq(agent.id, agentId));
  if (!found) return NextResponse.json({ ok: true });

  logger.info({ agentId, chatId, text }, "Webhook message received");

  // Intercept /cancel or /stop — handle synchronously so the user gets
  // immediate feedback and the cancel takes effect right away.
  if (isCancelCommand(text)) {
    const cancelled = await cancelChatRequest(agentId, chatId);
    await sendMessage(
      found.botToken,
      chatId,
      cancelled ? "✋ Cancelled." : "Nothing to cancel.",
    ).catch(() => {});
    return NextResponse.json({ ok: true });
  }

  if (found.status === "stopped") {
    await sendMessage(found.botToken, chatId, "This agent has been stopped. Please restart it from the dashboard.").catch(() => {});
    return NextResponse.json({ ok: true });
  }
  if (found.status === "starting" || !found.containerId) {
    await sendMessage(found.botToken, chatId, "Agent is starting up, please try again in a moment.").catch(() => {});
    return NextResponse.json({ ok: true });
  }
  if (found.status === "error") {
    await sendMessage(found.botToken, chatId, "This agent encountered an error. Please check the dashboard.").catch(() => {});
    return NextResponse.json({ ok: true });
  }

  // Fast-ACK: return 200 to Telegram immediately so it doesn't retry,
  // then process the message in the background. Per-chat queue serializes
  // multiple messages from the same user.
  const containerId = found.containerId;
  const botToken = found.botToken;
  const agentType = (found.type as AgentType) || "operations";

  after(async () => {
    await withChatQueue(`telegram:${agentId}:${chatId}`, () =>
      processTelegramMessage({ agentId, chatId, text, containerId, botToken, agentType }),
    );
  });

  return NextResponse.json({ ok: true });
}

async function processTelegramMessage(args: {
  agentId: string;
  chatId: string;
  text: string;
  containerId: string;
  botToken: string;
  agentType: AgentType;
}) {
  const { agentId, chatId, text, containerId, botToken, agentType } = args;

  const [session] = await db
    .select()
    .from(chatSession)
    .where(and(eq(chatSession.agentId, agentId), eq(chatSession.chatId, chatId)))
    .limit(1);

  const history: ChatMessage[] = (session?.history as ChatMessage[] | null) ?? [];
  const docFormat = detectDocumentRequest(text);

  const [logEntry] = await db.insert(agentLog).values({
    agentId,
    source: "telegram",
    status: "running",
    userPrompt: text,
  }).returning();
  const startTime = Date.now();
  const abortController = registerChatAbort(agentId, chatId, logEntry.id);

  // Show "typing..." while the agent is generating. The action expires after
  // ~5s, so refresh it every 4s until the response is ready.
  const typingAction: "typing" | "upload_document" = docFormat ? "upload_document" : "typing";
  sendChatAction(botToken, chatId, typingAction).catch(() => {});
  const typingInterval = setInterval(() => {
    sendChatAction(botToken, chatId, typingAction).catch(() => {});
  }, 4000);

  try {
    const result = docFormat
      ? await sendDocumentCommand(
          containerId,
          buildDocumentSystemInstruction(agentType),
          rewriteAsContentPrompt(text),
          history,
          abortController.signal,
        )
      : await sendCommand(
          containerId,
          text,
          history.length > 0 ? history : undefined,
          agentType,
          abortController.signal,
        );
    clearInterval(typingInterval);

    const responseText = result.text;
    await db.update(agentLog).set({
      status: "completed",
      assistantResponse: responseText,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      durationMs: Date.now() - startTime,
      completedAt: new Date(),
    }).where(eq(agentLog.id, logEntry.id));

    const updatedHistory: ChatMessage[] = [
      ...history,
      { role: "user" as const, content: text },
      { role: "assistant" as const, content: responseText },
    ].slice(-MAX_HISTORY);

    if (session) {
      await db.update(chatSession).set({ history: updatedHistory }).where(eq(chatSession.id, session.id));
    } else {
      await db.insert(chatSession).values({ agentId, chatId, history: updatedHistory });
    }

    try {
      if (docFormat) {
        const filename = extractFilename(text, agentType);
        const clean = stripConversationalFiller(responseText);

        let contentSource = clean;
        if (!isUsableContent(clean)) {
          logger.warn({ agentId, contentLength: clean.length }, "Document response too short, falling back to history");
          const last = [...history].reverse().find(m => m.role === "assistant");
          contentSource = last ? stripConversationalFiller(last.content) : clean;
        }

        const pdfTitle = filename.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        logger.info({ agentId, chatId, filename, contentLength: contentSource.length }, "Generating PDF");

        const pdfBuffer = await generatePdf(contentSource, pdfTitle, agentType);
        await sendDocument(botToken, chatId, pdfBuffer, `${filename}.pdf`, "📄 Here is your document.");
        logger.info({ agentId, chatId, filename }, "Document sent");
      } else {
        await sendMessage(botToken, chatId, responseText);
      }
    } catch (err) {
      logger.error({ agentId, chatId, err }, "Failed to deliver response");
      await db.insert(agentActivity).values({
        agentId,
        type: "error",
        message: `Failed to deliver to chat ${chatId}: ${err instanceof Error ? err.message : "Unknown"}`,
      });
      if (docFormat) {
        await sendMessage(botToken, chatId, responseText).catch(() => {});
      }
    }
  } catch (err) {
    clearInterval(typingInterval);
    const isAbort = err instanceof Error && err.name === "AbortError";
    if (!isAbort) {
      await db.update(agentLog).set({
        status: "error",
        durationMs: Date.now() - startTime,
        completedAt: new Date(),
      }).where(eq(agentLog.id, logEntry.id));

      logger.error({ agentId, err }, "Failed to reach agent container");
      const errMsg = err instanceof Error ? err.message : "";
      const userMessage = getAgentErrorMessage(errMsg, err);
      await sendMessage(botToken, chatId, userMessage).catch(() => {});
    }
  } finally {
    cleanupChatAbort(agentId, chatId, logEntry.id);
  }
}
