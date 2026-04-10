import { NextResponse } from "next/server";
import { db } from "../../../../../../shared/lib/drizzle";
import { agent } from "../../../../../../shared/db/schema/agent";
import { skill, agentSkill } from "../../../../../../shared/db/schema/skill";
import { eq } from "drizzle-orm";
import { getDomainConfig, type AgentType } from "../../../../../../shared/lib/agents/config";

function verifyGatewayToken(req: Request): boolean {
  const expected = process.env.GATEWAY_TOKEN;
  if (!expected) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${expected}`;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!verifyGatewayToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: agentId } = await params;

  const [agentRecord] = await db
    .select({ systemPrompt: agent.systemPrompt, type: agent.type })
    .from(agent)
    .where(eq(agent.id, agentId))
    .limit(1);

  if (!agentRecord) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const domainCfg = await getDomainConfig(agentRecord.type as AgentType);
  let fullSystemPrompt = domainCfg.boundaryPreamble + agentRecord.systemPrompt;

  const linkedSkills = await db
    .select({ name: skill.name, instructions: skill.instructions })
    .from(agentSkill)
    .innerJoin(skill, eq(agentSkill.skillId, skill.id))
    .where(eq(agentSkill.agentId, agentId));

  if (linkedSkills.length > 0) {
    const skillBlock = linkedSkills
      .map((s) => `## ${s.name}\n${s.instructions}`)
      .join("\n\n");
    fullSystemPrompt += `\n\n[USER SKILLS]\n${skillBlock}\n[END USER SKILLS]`;
  }

  return NextResponse.json({ systemPrompt: fullSystemPrompt });
}
