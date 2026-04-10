import { NextResponse } from "next/server";
import { db } from "../../../../../shared/lib/drizzle";
import { agent, agentActivity, chatSession } from "../../../../../shared/db/schema";
import { logger } from "../../../../../shared/lib/logger";
import { eq, and } from "drizzle-orm";
import { ChatMessage, sendCommand, sendDocumentCommand } from "../../../../../shared/lib/agents/docker";
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

  logger.info({ agentId, jid, text }, "WhatsApp inbound message received");

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
        found.containerId, text,
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
      return NextResponse.json({
        type: "document",
        document: pdfBuffer.toString("base64"),
        filename: `${filename}.pdf`,
        mimetype: "application/pdf",
        caption: "📄 Here is your document.",
      });
    } else {
      return NextResponse.json({ type: "text", text: responseText });
    }
  } catch (err) {
    logger.error({ agentId, jid, err }, "Failed to process WhatsApp message");
    const isTimeout = err instanceof Error && err.name === "TimeoutError";
    // Inner try-catch: a DB insert failure must not prevent the JSON response
    try {
      await db.insert(agentActivity).values({
        agentId, type: "error",
        message: `WhatsApp ${jid}: ${err instanceof Error ? err.message : "Unknown"}`,
      });
    } catch (dbErr) {
      logger.error({ agentId, jid, dbErr }, "Failed to record WhatsApp error activity");
    }
    return NextResponse.json({
      type: "text",
      text: isTimeout
        ? "⏳ Your request is taking longer than expected. Please try again in a moment."
        : "🚀 The agent is warming up. Please send your message again in a few seconds!",
    });
  }
}
