import { NextResponse } from "next/server";
import { db } from "../../../../../shared/lib/drizzle";
import { agent, agentActivity, chatSession } from "../../../../../shared/db/schema";
import { logger } from "../../../../../shared/lib/logger";
import { sendDocument, sendMessage } from "../../../../../shared/lib/telegram/bot";
import { eq, and } from "drizzle-orm";
import { InferSelectModel } from "drizzle-orm";
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
import { classifyAgentError } from "../../../../../shared/lib/error-handle";
import { acquireLock, releaseLock } from "../../../../../shared/lib/redis";
type AgentRow = InferSelectModel<typeof agent>;
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

  const serviceEnabled = await getServiceEnabled();
  if (!serviceEnabled) {
    logger.info({ agentId }, "Service blocked — message dropped");
    return NextResponse.json({ ok: true });
  }

  const body = await req.json();
  const message = body?.message;
  if (!message?.text) return NextResponse.json({ ok: true });

  const chatId = String(message.chat.id);
  const messageId = String(message.message_id);
  const lockKey = `lock:${agentId}:${chatId}:${messageId}`;

  const acquired = await acquireLock(lockKey);
  if (!acquired) {
    logger.info({ agentId, chatId, messageId }, "Duplicate webhook — dropping retry");
    return NextResponse.json({ ok: true });
  }

const [found] = await db.select().from(agent).where(eq(agent.id, agentId)) as AgentRow[];
  if (!found) {
    await releaseLock(lockKey);
    return NextResponse.json({ ok: true });
  }

  const text = message.text.trim();
  logger.info({ agentId, chatId, text }, "Webhook message received");

  if (found.status === "stopped") {
    await releaseLock(lockKey);
    await sendMessage(found.botToken, chatId, "This agent has been stopped.").catch(() => {});
    return NextResponse.json({ ok: true });
  }
  if (found.status === "starting" || !found.containerId) {
    await releaseLock(lockKey);
    await sendMessage(found.botToken, chatId, "Agent is starting up, please try again in a moment.").catch(() => {});
    return NextResponse.json({ ok: true });
  }
  if (found.status === "error") {
    await releaseLock(lockKey);
    await sendMessage(found.botToken, chatId, "This agent encountered an error.").catch(() => {});
    return NextResponse.json({ ok: true });
  }

  // Return 200 immediately, process in background
  const task = processMessage({ agentId, found, chatId, text }).finally(() => {
    releaseLock(lockKey);
  });

  // On Node.js/ECS the process stays alive long enough for the background
  // promise to resolve — no waitUntil needed.
  void task;

  return NextResponse.json({ ok: true });
}

async function processMessage({
  agentId,
  found,
  chatId,
  text,
}: {
  agentId: string;
  found: AgentRow;

  chatId: string;
  text: string;
}) {
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
      responseText = await sendDocumentCommand(
        found.containerId!,
        buildDocumentSystemInstruction(agentType),
        rewriteAsContentPrompt(text),
        history,
      );
    } else {
      responseText = await sendCommand(
        found.containerId!,
        text,
        history.length > 0 ? history : undefined,
        agentType,
      );
    }

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
      if (docFormat) {
        await sendMessage(found.botToken, chatId, responseText).catch(() => {});
      }
    }
  } catch (err) {
    const kind = classifyAgentError(err);

    logger.error({ agentId, kind, err }, "Agent command failed");

    await db.insert(agentActivity).values({
      agentId,
      type: "error",
      message: `[${kind}] ${err instanceof Error ? err.message : "Unknown error"}`,
    });

    const userMessage =
      kind === "unreachable"
        ? "⚠️ The agent container is currently unreachable. Please check the dashboard or restart the agent."
        : kind === "timeout"
        ? "⏳ The agent is taking too long to respond. Your message was received — please try again in a moment."
        : "Something went wrong processing your request. Please try again shortly.";

    await sendMessage(found.botToken, chatId, userMessage).catch(() => {});

    if (kind === "unreachable") {
      await db
        .update(agent)
        .set({ status: "error" })
        .where(eq(agent.id, agentId))
        .catch(() => {});
    }
  }
}