import { NextResponse } from "next/server";
import { getSessionOrThrow } from "../../../../../shared/lib/auth/getSessionOrThrow";
import { db } from "../../../../../shared/lib/drizzle";
import { agent } from "../../../../../shared/db/schema/agent";
import { skill, agentSkill } from "../../../../../shared/db/schema/skill";
import { eq, and } from "drizzle-orm";
import { logger } from "../../../../../shared/lib/logger";
import { relaunchAgentWithChannels } from "../../../../../shared/lib/agents/relaunch";

async function getOwnedAgent(req: Request, agentId: string) {
  const session = await getSessionOrThrow(req);
  const [found] = await db
    .select()
    .from(agent)
    .where(and(eq(agent.id, agentId), eq(agent.userId, session.user.id)));
  return { agent: found ?? null, session };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { agent: found } = await getOwnedAgent(req, id);
    if (!found) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const skills = await db
      .select({
        linkId: agentSkill.id,
        id: skill.id,
        name: skill.name,
        description: skill.description,
        createdAt: agentSkill.createdAt,
      })
      .from(agentSkill)
      .innerJoin(skill, eq(agentSkill.skillId, skill.id))
      .where(eq(agentSkill.agentId, id));

    return NextResponse.json({ skills });
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to list agent skills");
    return NextResponse.json({ error: "Failed to list agent skills" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { agent: found, session } = await getOwnedAgent(req, id);
    if (!found) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const body = await req.json();
    const { skillId } = body as { skillId: string };

    if (!skillId || typeof skillId !== "string") {
      return NextResponse.json({ error: "skillId is required" }, { status: 400 });
    }

    // Verify skill belongs to the same user
    const [ownedSkill] = await db
      .select({ id: skill.id })
      .from(skill)
      .where(and(eq(skill.id, skillId), eq(skill.userId, session.user.id)));

    if (!ownedSkill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    // Check limit
    const existing = await db
      .select({ id: agentSkill.id })
      .from(agentSkill)
      .where(eq(agentSkill.agentId, id));

    if (existing.length >= 20) {
      return NextResponse.json({ error: "Maximum 20 skills per agent" }, { status: 429 });
    }

    // Link skill to agent
    try {
      const [created] = await db
        .insert(agentSkill)
        .values({ agentId: id, skillId })
        .returning();

      logger.info({ agentId: id, skillId }, "Skill linked to agent");

      // Relaunch so the container picks up the new skill
      await relaunchAgentWithChannels(id);

      return NextResponse.json({ skill: created }, { status: 201 });
    } catch (insertErr: unknown) {
      // Unique constraint violation — skill already linked
      const message = insertErr instanceof Error ? insertErr.message : "";
      if (message.includes("unique") || message.includes("duplicate")) {
        return NextResponse.json({ error: "Skill already linked to this agent" }, { status: 409 });
      }
      throw insertErr;
    }
  } catch (err) {
    if (err instanceof Response) return err;
    logger.error({ err }, "Failed to add skill to agent");
    return NextResponse.json({ error: "Failed to add skill to agent" }, { status: 500 });
  }
}
