import { NextResponse } from "next/server";
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

  const [found] = await db.select().from(agent).where(eq(agent.id, agentId));
  if (!found) return NextResponse.json({ ok: true });

  const body = await req.json();
  const message = body?.message;
  if (!message?.text) return NextResponse.json({ ok: true });

  const chatId = String(message.chat.id);
  const text = message.text.trim();

  logger.info({ agentId, chatId, text }, "Webhook message received");

  // Intercept /cancel or /stop — do NOT forward to the agent.
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

  const [session] = await db
    .select()
    .from(chatSession)
    .where(and(eq(chatSession.agentId, agentId), eq(chatSession.chatId, chatId)))
    .limit(1);

  const history: ChatMessage[] = (session?.history as ChatMessage[] | null) ?? [];
  const agentType = (found.type as AgentType) || "operations";
  const docFormat = detectDocumentRequest(text);

  // Create log entry
  const [logEntry] = await db.insert(agentLog).values({
    agentId,
    source: "telegram",
    status: "running",
    userPrompt: text,
  }).returning();
  const startTime = Date.now();
  const abortController = registerChatAbort(agentId, chatId, logEntry.id);

  // Show "typing..." in Telegram while the agent is generating. The action
  // expires after ~5s, so refresh it every 4s until the response is ready.
  const typingAction: "typing" | "upload_document" = docFormat ? "upload_document" : "typing";
  sendChatAction(found.botToken, chatId, typingAction).catch(() => {});
  const typingInterval = setInterval(() => {
    sendChatAction(found.botToken, chatId, typingAction).catch(() => {});
  }, 4000);

  try {
    const result = docFormat
      ? await sendDocumentCommand(
          found.containerId,
          buildDocumentSystemInstruction(agentType),
          rewriteAsContentPrompt(text),
          history,
          abortController.signal,
        )
      : await sendCommand(
          found.containerId,
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

    // Save history with the original user text so conversation context stays natural
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

        // If the agent somehow still gave us too little content, fall back to
        // the last real assistant turn from history
        let contentSource = clean;
        if (!isUsableContent(clean)) {
          logger.warn({ agentId, contentLength: clean.length }, "Document response too short, falling back to history");
          const last = [...history].reverse().find(m => m.role === "assistant");
          contentSource = last ? stripConversationalFiller(last.content) : clean;
        }

        const pdfTitle = filename.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        logger.info({ agentId, chatId, filename, contentLength: contentSource.length }, "Generating PDF");

        const pdfBuffer = await generatePdf(contentSource, pdfTitle, agentType);
        await sendDocument(found.botToken, chatId, pdfBuffer, `${filename}.pdf`, "📄 Here is your document.");
        logger.info({ agentId, chatId, filename }, "Document sent");
      } else {
        await sendMessage(found.botToken, chatId, responseText);
      }
    } catch (err) {
      logger.error({ agentId, chatId, err }, "Failed to deliver response");
      await db.insert(agentActivity).values({
        agentId,
        type: "error",
        message: `Failed to deliver to chat ${chatId}: ${err instanceof Error ? err.message : "Unknown"}`,
      });
      // Fallback: send the raw text so the user isn't left with no response
      if (docFormat) {
        await sendMessage(found.botToken, chatId, responseText).catch(() => {});
      }
    }
  } catch (err) {
    clearInterval(typingInterval);
    const isAbort = err instanceof Error && err.name === "AbortError";
    // If aborted, cancelChatRequest already marked the log; don't clobber it.
    if (!isAbort) {
      await db.update(agentLog).set({
        status: "error",
        durationMs: Date.now() - startTime,
        completedAt: new Date(),
      }).where(eq(agentLog.id, logEntry.id));

      logger.error({ agentId, err }, "Failed to reach agent container");
      const errMsg = err instanceof Error ? err.message : "";
      const userMessage = getAgentErrorMessage(errMsg, err);
      await sendMessage(found.botToken, chatId, userMessage).catch(() => {});
    }
  } finally {
    cleanupChatAbort(agentId, chatId, logEntry.id);
  }

  return NextResponse.json({ ok: true });
}
