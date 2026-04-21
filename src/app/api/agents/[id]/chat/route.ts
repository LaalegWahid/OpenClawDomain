import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../../../shared/lib/drizzle";
import { agent, agentActivity, agentLog, chatSession } from "../../../../../shared/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../../../../../shared/lib/logger";
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
import { getServiceEnabled } from "../../../../../shared/lib/service/status";

const MAX_HISTORY = 20;

const TIMEOUT_WORDS = [
  "Thinking...",
  "Imagining...",
  "Discombobulating...",
  "Pondering...",
  "Cogitating...",
  "Mulling...",
  "Percolating...",
  "Ruminating...",
  "Marinating...",
  "Brewing...",
  "Conjuring...",
  "Untangling...",
];

function randomTimeoutWord(): string {
  return TIMEOUT_WORDS[Math.floor(Math.random() * TIMEOUT_WORDS.length)];
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionOrThrow(req);
    const { id } = await params;

    const [found] = await db
      .select()
      .from(agent)
      .where(and(eq(agent.id, id), eq(agent.userId, session.user.id)));

    if (!found) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const chatId = `web_${session.user.id}`;
    const [existing] = await db
      .select()
      .from(chatSession)
      .where(and(eq(chatSession.agentId, id), eq(chatSession.chatId, chatId)))
      .limit(1);

    return NextResponse.json({
      history: (existing?.history as ChatMessage[] | null) ?? [],
    });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to get chat history");
    return NextResponse.json({ error: "Failed to get chat history" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionOrThrow(req);
    const { id } = await params;

    const serviceEnabled = await getServiceEnabled();
    if (!serviceEnabled) {
      return NextResponse.json({ error: "Service is temporarily disabled" }, { status: 503 });
    }

    const [found] = await db
      .select()
      .from(agent)
      .where(and(eq(agent.id, id), eq(agent.userId, session.user.id)));

    if (!found) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const body = await req.json();
    const text = (body?.message ?? "").trim();
    if (!text) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const chatKeyForAbort = `web_${session.user.id}`;

    // Intercept /cancel or /stop — do NOT forward to the agent.
    if (isCancelCommand(text)) {
      const cancelled = await cancelChatRequest(id, chatKeyForAbort);
      return NextResponse.json({
        reply: cancelled ? "✋ Cancelled." : "Nothing to cancel.",
      });
    }

    if (found.status === "stopped") {
      return NextResponse.json({ error: "Agent has been stopped. Restart it from the dashboard." }, { status: 400 });
    }
    if (found.status === "starting" || !found.containerId) {
      return NextResponse.json({ error: "Agent is starting up, please try again in a moment." }, { status: 400 });
    }
    if (found.status === "error") {
      return NextResponse.json({ error: "Agent encountered an error. Check the dashboard." }, { status: 400 });
    }

    const chatId = `web_${session.user.id}`;
    const [existing] = await db
      .select()
      .from(chatSession)
      .where(and(eq(chatSession.agentId, id), eq(chatSession.chatId, chatId)))
      .limit(1);

    const history: ChatMessage[] = (existing?.history as ChatMessage[] | null) ?? [];
    const agentType = (found.type as AgentType) || "operations";
    const docFormat = detectDocumentRequest(text);

    logger.info({ agentId: id, chatId, text, docFormat }, "Web chat message");

    // Create log entry + abort controller
    const [logEntry] = await db.insert(agentLog).values({
      agentId: id,
      source: "chat_ui",
      status: "running",
      userPrompt: text,
    }).returning();
    const abortController = registerChatAbort(id, chatKeyForAbort, logEntry.id);
    const startTime = Date.now();

    let responseText: string;

    try {
      if (docFormat) {
        const result = await sendDocumentCommand(
          found.containerId,
          buildDocumentSystemInstruction(agentType),
          rewriteAsContentPrompt(text),
          history,
          abortController.signal,
        );
        responseText = result.text;
        await db.update(agentLog).set({
          status: "completed",
          assistantResponse: responseText,
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          durationMs: Date.now() - startTime,
          completedAt: new Date(),
        }).where(eq(agentLog.id, logEntry.id));
      } else {
        const result = await sendCommand(
          found.containerId,
          text,
          history.length > 0 ? history : undefined,
          agentType,
          abortController.signal,
        );
        responseText = result.text;
        await db.update(agentLog).set({
          status: "completed",
          assistantResponse: responseText,
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          durationMs: Date.now() - startTime,
          completedAt: new Date(),
        }).where(eq(agentLog.id, logEntry.id));
      }
    } catch (err) {
      const isAbort = err instanceof Error && err.name === "AbortError";
      await db.update(agentLog).set({
        status: isAbort ? "aborted" : "error",
        durationMs: Date.now() - startTime,
        completedAt: new Date(),
      }).where(eq(agentLog.id, logEntry.id));
      cleanupChatAbort(id, chatKeyForAbort, logEntry.id);

      logger.error({ agentId: id, err }, "Failed to reach agent container");
      const isTimeout = err instanceof Error && err.name === "TimeoutError";
      // On timeout, reply with a short whimsical word rendered as an
      // assistant message instead of a red error banner. History is not
      // updated (we fell through the catch), so the placeholder doesn't
      // pollute future context.
      if (isTimeout) {
        return NextResponse.json({ reply: randomTimeoutWord() });
      }
      return NextResponse.json(
        { error: isAbort ? "Task was aborted." : "Failed to reach the agent. It may be starting up — try again shortly." },
        { status: isAbort ? 499 : 502 },
      );
    } finally {
      cleanupChatAbort(id, chatKeyForAbort, logEntry.id);
    }

    // Save history
    const updatedHistory: ChatMessage[] = [
      ...history,
      { role: "user" as const, content: text },
      { role: "assistant" as const, content: responseText },
    ].slice(-MAX_HISTORY);

    if (existing) {
      await db.update(chatSession).set({ history: updatedHistory }).where(eq(chatSession.id, existing.id));
    } else {
      await db.insert(chatSession).values({ agentId: id, chatId, history: updatedHistory });
    }

    // Handle document generation
    if (docFormat) {
      try {
        const filename = extractFilename(text, agentType);
        const clean = stripConversationalFiller(responseText);

        let contentSource = clean;
        if (!isUsableContent(clean)) {
          logger.warn({ agentId: id, contentLength: clean.length }, "Document response too short, falling back to history");
          const last = [...history].reverse().find(m => m.role === "assistant");
          contentSource = last ? stripConversationalFiller(last.content) : clean;
        }

        const pdfTitle = filename.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        const pdfBuffer = await generatePdf(contentSource, pdfTitle, agentType);
        const base64 = Buffer.from(pdfBuffer).toString("base64");

        return NextResponse.json({
          reply: responseText,
          document: {
            data: `data:application/pdf;base64,${base64}`,
            filename: `${filename}.pdf`,
          },
        });
      } catch (err) {
        logger.error({ agentId: id, err }, "Failed to generate PDF");
        await db.insert(agentActivity).values({
          agentId: id,
          type: "error",
          message: `Failed to generate PDF for web chat: ${err instanceof Error ? err.message : "Unknown"}`,
        });
        // Still return the text response even if PDF generation fails
        return NextResponse.json({ reply: responseText });
      }
    }

    return NextResponse.json({ reply: responseText });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to process chat message");
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionOrThrow(req);
    const { id } = await params;

    const [found] = await db
      .select()
      .from(agent)
      .where(and(eq(agent.id, id), eq(agent.userId, session.user.id)));

    if (!found) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const chatId = `web_${session.user.id}`;
    await db
      .delete(chatSession)
      .where(and(eq(chatSession.agentId, id), eq(chatSession.chatId, chatId)));

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to clear chat history");
    return NextResponse.json({ error: "Failed to clear chat history" }, { status: 500 });
  }
}
