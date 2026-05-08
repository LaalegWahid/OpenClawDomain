import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db } from "../../../../../../shared/lib/drizzle";
import { agent } from "../../../../../../shared/db/schema/agent";
import { skill, agentSkill } from "../../../../../../shared/db/schema/skill";
import { getDomainConfig, type AgentType } from "../../../../../../shared/lib/agents/config";
import { logger } from "../../../../../../shared/lib/logger";

function verifyGatewayToken(req: Request): boolean {
  const expected = process.env.GATEWAY_TOKEN;
  if (!expected) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${expected}`;
}

/**
 * Returns the list of peer agents for a given agent. Peers are other agents
 * owned by the same user, excluding the requester. Used by the agent's
 * entrypoint to materialize PEERS.md so the model can discover who else it
 * can consult via the peer-ask tool.
 *
 * Stopped/error agents are included with their status so the asking agent
 * can decide to skip them rather than rediscover them at call time.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!verifyGatewayToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: selfAgentId } = await params;

  const [selfRow] = await db
    .select({ userId: agent.userId })
    .from(agent)
    .where(eq(agent.id, selfAgentId))
    .limit(1);
  if (!selfRow) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const peerRows = await db
    .select({
      id: agent.id,
      name: agent.name,
      type: agent.type,
      status: agent.status,
    })
    .from(agent)
    .where(and(eq(agent.userId, selfRow.userId), ne(agent.id, selfAgentId)));

  const peerIds = peerRows.map((p) => p.id);
  const skillRows = peerIds.length === 0
    ? []
    : await db
        .select({
          agentId: agentSkill.agentId,
          name: skill.name,
          description: skill.description,
        })
        .from(agentSkill)
        .innerJoin(skill, eq(agentSkill.skillId, skill.id))
        .where(eq(skill.userId, selfRow.userId));

  const skillsByAgent = new Map<string, { name: string; description: string }[]>();
  for (const s of skillRows) {
    if (!peerIds.includes(s.agentId)) continue;
    const list = skillsByAgent.get(s.agentId) ?? [];
    list.push({ name: s.name, description: s.description });
    skillsByAgent.set(s.agentId, list);
  }

  const peers = await Promise.all(
    peerRows.map(async (p) => {
      let role = p.type;
      try {
        const cfg = await getDomainConfig(p.type as AgentType);
        role = cfg.label;
      } catch (err) {
        logger.warn({ err, type: p.type }, "getDomainConfig failed for peer; using raw type");
      }
      return {
        id: p.id,
        name: p.name,
        type: p.type,
        status: p.status,
        role,
        skills: skillsByAgent.get(p.id) ?? [],
      };
    }),
  );

  return NextResponse.json({ peers });
}
