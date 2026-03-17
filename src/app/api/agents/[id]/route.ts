import { NextResponse } from "next/server";
import { getSessionOrThrow } from "@/shared/lib/auth/getSessionOrThrow";
import { db } from "@/shared/lib/drizzle";
import { agent, agentActivity } from "@/shared/db/schema/agent";
import { eq, and, desc } from "drizzle-orm";
import { stopContainer } from "@/shared/lib/agents/docker";

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

    const activities = await db
      .select()
      .from(agentActivity)
      .where(eq(agentActivity.agentId, id))
      .orderBy(desc(agentActivity.createdAt))
      .limit(20);

    return NextResponse.json({ agent: found, activities });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

    if (found.containerId) {
      await stopContainer(found.containerId);
    }

    await db
      .update(agent)
      .set({ status: "stopped", containerId: null, containerPort: null })
      .where(eq(agent.id, id));

    await db.insert(agentActivity).values({
      agentId: id,
      type: "stop",
      message: "Agent stopped by user",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
