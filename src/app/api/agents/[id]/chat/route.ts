import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../../../shared/lib/drizzle";
import { agent, agentActivity, chatSession } from "../../../../../shared/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../../../../../shared/lib/logger";
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
import { getServiceEnabled } from "../../../../../shared/lib/service/status";

const MAX_HISTORY = 20;

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

    let responseText: string;

    try {
      if (docFormat) {
        responseText = await sendDocumentCommand(
          found.containerId,
          buildDocumentSystemInstruction(agentType),
          rewriteAsContentPrompt(text),
          history,
        );
      } else {
        responseText = await sendCommand(
          found.containerId,
          text,
          history.length > 0 ? history : undefined,
          agentType,
        );
      }
    } catch (err) {
      logger.error({ agentId: id, err }, "Failed to reach agent container");
      const isTimeout = err instanceof Error && err.name === "TimeoutError";
      return NextResponse.json(
        { error: isTimeout ? "Processing took too long, please try again." : "Failed to reach the agent. It may be starting up — try again shortly." },
        { status: 502 },
      );
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
