import { NextResponse } from "next/server";
import { db } from "../../../../../shared/lib/drizzle";
import { agent, agentActivity, chatSession } from "../../../../../shared/db/schema";
import { logger } from "../../../../../shared/lib/logger";
import { sendDocument, sendMessage } from "../../../../../shared/lib/telegram/bot";
import { eq, and } from "drizzle-orm";
import { ChatMessage, sendCommand, sendDocumentCommand } from "../../../../../shared/lib/agents/docker";
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

  try {
    let responseText: string;

    if (docFormat) {
      // Document path — developer role injection puts the agent into
      // document-writer mode. The tool loop in sendDocumentCommand handles
      // any web_search calls the agent makes for data to include.
      responseText = await sendDocumentCommand(
        found.containerId,
        buildDocumentSystemInstruction(agentType),
        rewriteAsContentPrompt(text),
        history,
      );
    } else {
      // Normal chat — tool loop handles any tool calls the agent makes
      responseText = await sendCommand(
        found.containerId,
        text,
        history.length > 0 ? history : undefined,
        agentType,
      );
    }

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
        message: "Failed to send response via Telegram",
        metadata: { chatId, error: err instanceof Error ? err.message : String(err) },
      });
      // Fallback: send the raw text so the user isn't left with no response
      if (docFormat) {
        await sendMessage(found.botToken, chatId, responseText).catch(() => {});
      }
    }
  } catch (err) {
    logger.error({ agentId, err }, "Failed to reach agent container");
    const isTimeout = err instanceof Error && err.name === "TimeoutError";
    await sendMessage(
      found.botToken,
      chatId,
      isTimeout
        ? "⏳ Your request is taking longer than expected."
        : "🚀 The agent is warming up and will be ready shortly. Please send your message again in a few seconds!"
    ).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}