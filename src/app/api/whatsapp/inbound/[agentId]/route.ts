import { NextResponse } from "next/server";
import { db } from "../../../../../shared/lib/drizzle";
import { agent, agentActivity, agentLog, chatSession } from "../../../../../shared/db/schema";
import { agentChannel } from "../../../../../shared/db/schema/agent";
import { logger } from "../../../../../shared/lib/logger";
import { eq, and } from "drizzle-orm";
import { ChatMessage, sendCommand, sendDocumentCommand, registerChatAbort, cleanupChatAbort } from "../../../../../shared/lib/agents/docker";
import { isCancelCommand, cancelChatRequest } from "../../../../../shared/lib/agents/cancel";
import { AgentType } from "../../../../../shared/lib/agents/config";
import {
  detectDocumentRequest, extractFilename, generatePdf,
  buildDocumentSystemInstruction, rewriteAsContentPrompt,
  stripConversationalFiller, isUsableContent,
} from "../../../../../shared/lib/agents/document";
import { env } from "../../../../../shared/config/env";
import { getServiceEnabled } from "../../../../../shared/lib/service/status";

const MAX_HISTORY = 20;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const auth = req.headers.get("Authorization") ?? "";
  if (auth !== `Bearer ${env.GATEWAY_TOKEN}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { agentId } = await params;

  const serviceEnabled = await getServiceEnabled();
  if (!serviceEnabled) {
    logger.info({ agentId }, "Service blocked — WhatsApp message dropped");
    return NextResponse.json({ type: "text", text: "Service temporarily unavailable." });
  }

  // Parse body — must be inside a try so a malformed request never returns HTML 500
  let jid: string, text: string;
  try {
    const body = await req.json() as { jid: string; text: string; pushName?: string };
    jid = body.jid;
    text = body.text;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!jid || !text?.trim()) return NextResponse.json({ ok: true });

  // Check allowed sender filter
  const [waChannel] = await db.select().from(agentChannel)
    .where(and(eq(agentChannel.agentId, agentId), eq(agentChannel.platform, "whatsapp")))
    .limit(1);
  type WaCreds = { allowedJid?: string | null; allowedJids?: string[]; discoveredOwnerJid?: string };
  const creds = (waChannel?.credentials ?? {}) as WaCreds;
  // Support both legacy single allowedJid and new allowedJids array
  const allowedJids: string[] = Array.isArray(creds.allowedJids)
    ? creds.allowedJids
    : creds.allowedJid ? [creds.allowedJid] : [];

  if (allowedJids.length > 0) {
    const incomingNum = jid.split("@")[0];
    const isAllowed = allowedJids.some(
      (a) => a === jid || a.split("@")[0] === incomingNum,
    );
    if (!isAllowed) {
      logger.info({ agentId, jid }, "WhatsApp message ignored — sender not in allowed list");
      return NextResponse.json({ ok: true });
    }
  }

  // Auto-capture the first incoming JID so the UI can offer "Restrict to me"
  if (waChannel && allowedJids.length === 0 && !creds.discoveredOwnerJid) {
    db.update(agentChannel)
      .set({ credentials: { ...creds, discoveredOwnerJid: jid } })
      .where(eq(agentChannel.id, waChannel.id))
      .catch(() => {});
  }

  logger.info({ agentId, jid, text }, "WhatsApp inbound message received");

  // Intercept /cancel or /stop — do NOT forward to the agent.
  if (isCancelCommand(text)) {
    const cancelled = await cancelChatRequest(agentId, jid);
    return NextResponse.json({
      type: "text",
      text: cancelled ? "✋ Cancelled." : "Nothing to cancel.",
    });
  }

  const [found] = await db.select().from(agent).where(eq(agent.id, agentId));
  if (!found) return NextResponse.json({ type: "text", text: "Agent not found." });

  if (found.status === "stopped")
    return NextResponse.json({ type: "text", text: "This agent has been stopped. Please restart it from the dashboard." });
  if (found.status === "starting" || !found.containerId)
    return NextResponse.json({ type: "text", text: "Agent is starting up, please try again in a moment." });
  if (found.status === "error")
    return NextResponse.json({ type: "text", text: "This agent encountered an error. Please check the dashboard." });

  const [session] = await db
    .select().from(chatSession)
    .where(and(eq(chatSession.agentId, agentId), eq(chatSession.chatId, jid)))
    .limit(1);

  const history: ChatMessage[] = (session?.history as ChatMessage[] | null) ?? [];
  const agentType = (found.type as AgentType) || "operations";
  const docFormat = detectDocumentRequest(text);

  // Create log entry
  const [logEntry] = await db.insert(agentLog).values({
    agentId,
    source: "whatsapp",
    status: "running",
    userPrompt: text,
  }).returning();
  const startTime = Date.now();
  const abortController = registerChatAbort(agentId, jid, logEntry.id);

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
          found.containerId, text,
          history.length > 0 ? history : undefined,
          agentType,
          abortController.signal,
        );

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
      await db.insert(chatSession).values({ agentId, chatId: jid, history: updatedHistory });
    }

    if (docFormat) {
      const filename = extractFilename(text, agentType);
      const clean = stripConversationalFiller(responseText);
      let contentSource = clean;
      if (!isUsableContent(clean)) {
        const last = [...history].reverse().find(m => m.role === "assistant");
        contentSource = last ? stripConversationalFiller(last.content) : clean;
      }
      const pdfTitle = filename.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      logger.info({ agentId, jid, filename, contentLength: contentSource.length }, "Generating WhatsApp PDF");
      const pdfBuffer = await generatePdf(contentSource, pdfTitle, agentType);
      logger.info({ agentId, jid, filename }, "WhatsApp PDF generated");
      cleanupChatAbort(agentId, jid, logEntry.id);
      return NextResponse.json({
        type: "document",
        document: pdfBuffer.toString("base64"),
        filename: `${filename}.pdf`,
        mimetype: "application/pdf",
        caption: "📄 Here is your document.",
      });
    } else {
      cleanupChatAbort(agentId, jid, logEntry.id);
      return NextResponse.json({ type: "text", text: responseText });
    }
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    if (isAbort) {
      // The /cancel webhook already replied "✋ Cancelled." — stay silent here
      // so the user doesn't receive a duplicate message.
      cleanupChatAbort(agentId, jid, logEntry.id);
      return NextResponse.json({ ok: true });
    }
    await db.update(agentLog).set({
      status: "error",
      durationMs: Date.now() - startTime,
      completedAt: new Date(),
    }).where(eq(agentLog.id, logEntry.id));

    logger.error({ agentId, jid, err }, "Failed to process WhatsApp message");
    const isTimeout = err instanceof Error && err.name === "TimeoutError";
    if (isTimeout) {
      // Suppress timeout messages — let the user retry on their own.
      cleanupChatAbort(agentId, jid, logEntry.id);
      return NextResponse.json({ ok: true });
    }
    // Inner try-catch: a DB insert failure must not prevent the JSON response
    try {
      await db.insert(agentActivity).values({
        agentId, type: "error",
        message: `WhatsApp ${jid}: ${err instanceof Error ? err.message : "Unknown"}`,
      });
    } catch (dbErr) {
      logger.error({ agentId, jid, dbErr }, "Failed to record WhatsApp error activity");
    }
    cleanupChatAbort(agentId, jid, logEntry.id);
    return NextResponse.json({
      type: "text",
      text: "🚀 The agent is warming up. Please send your message again in a few seconds!",
    });
  }
}
