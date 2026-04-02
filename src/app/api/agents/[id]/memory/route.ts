import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../../../shared/lib/drizzle";
import { agent, chatSession } from "../../../../../shared/db/schema/agent";
import { eq, and } from "drizzle-orm";
import { logger } from "../../../../../shared/lib/logger";

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

    const sessions = await db
      .select()
      .from(chatSession)
      .where(eq(chatSession.agentId, id));

    const sessionStats = sessions.map((s) => {
      const history = (s.history as Array<{ role: string; content: string }>) ?? [];
      const charCount = history.reduce((acc, msg) => acc + (msg.content?.length ?? 0), 0);
      return {
        chatId: s.chatId,
        messageCount: history.length,
        estimatedTokens: Math.round(charCount / 4),
        lastUpdated: s.updatedAt,
      };
    });

    const totalMessages = sessionStats.reduce((acc, s) => acc + s.messageCount, 0);
    const totalChars = sessions.reduce((acc, s) => {
      const history = (s.history as Array<{ role: string; content: string }>) ?? [];
      return acc + history.reduce((a, m) => a + (m.content?.length ?? 0), 0);
    }, 0);

    return NextResponse.json({
      sessionCount: sessions.length,
      totalMessages,
      estimatedTokens: Math.round(totalChars / 4),
      sessions: sessionStats,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to get memory stats");
    return NextResponse.json({ error: "Failed to get memory stats" }, { status: 500 });
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

    const sessions = await db
      .select({ id: chatSession.id })
      .from(chatSession)
      .where(eq(chatSession.agentId, id));

    await db
      .update(chatSession)
      .set({ history: [], lastResponseId: null })
      .where(eq(chatSession.agentId, id));

    logger.info({ agentId: id, cleared: sessions.length }, "Context cleared");
    return NextResponse.json({ cleared: sessions.length });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to clear context");
    return NextResponse.json({ error: "Failed to clear context" }, { status: 500 });
  }
}
