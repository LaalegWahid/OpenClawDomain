import { NextResponse } from "next/server";
import { getSessionOrThrow } from "@/shared/lib/auth/getSessionOrThrow";
import { db } from "@/shared/lib/drizzle";
import { agent, agentActivity } from "@/shared/db/schema/agent";
import { eq } from "drizzle-orm";
import { getAgentConfig } from "@/shared/lib/agents/config";
import { launchContainer } from "@/shared/lib/agents/docker";
import { logger } from "@/shared/lib/logger";

export async function POST(req: Request) {
  try {
    const session = await getSessionOrThrow(req);
    const { type } = await req.json();

    if (!["finance", "marketing", "ops"].includes(type)) {
      return NextResponse.json({ error: "Invalid agent type" }, { status: 400 });
    }

    // Check if user already has an active agent of this type
    const existing = await db
      .select()
      .from(agent)
      .where(eq(agent.userId, session.user.id))
      .then((rows) => rows.find((r) => r.type === type && r.status !== "stopped"));

    if (existing) {
      return NextResponse.json(
        { error: "Agent of this type already running", agent: existing },
        { status: 409 },
      );
    }

    const config = getAgentConfig(type);

    // Create agent record
    const [newAgent] = await db
      .insert(agent)
      .values({
        userId: session.user.id,
        type,
        name: config.name,
        status: "starting",
      })
      .returning();

    // Launch Docker container
    try {
      const { containerId, port } = await launchContainer(
        session.user.id,
        type,
        newAgent.id,
      );

      await db
        .update(agent)
        .set({ containerId, containerPort: port, status: "active" })
        .where(eq(agent.id, newAgent.id));

      await db.insert(agentActivity).values({
        agentId: newAgent.id,
        type: "launch",
        message: `${config.name} launched successfully`,
      });

      const updated = await db
        .select()
        .from(agent)
        .where(eq(agent.id, newAgent.id))
        .then((rows) => rows[0]);

      logger.info({ agentId: newAgent.id, type, userId: session.user.id }, "Agent launched");
      return NextResponse.json({ agent: updated }, { status: 201 });
    } catch (err) {
      await db
        .update(agent)
        .set({ status: "error" })
        .where(eq(agent.id, newAgent.id));

      await db.insert(agentActivity).values({
        agentId: newAgent.id,
        type: "error",
        message: `Failed to launch container: ${err instanceof Error ? err.message : "Unknown error"}`,
      });

      logger.error({ agentId: newAgent.id, err }, "Failed to launch agent container");
      return NextResponse.json(
        { error: "Failed to launch agent container" },
        { status: 500 },
      );
    }
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getSessionOrThrow(req);

    const agents = await db
      .select()
      .from(agent)
      .where(eq(agent.userId, session.user.id));

    logger.info({ userId: session.user.id, count: agents.length }, "Agents listed");
    return NextResponse.json({ agents });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
