import { NextResponse } from "next/server";
import { db } from "../../../../../../shared/lib/drizzle";
import { agent } from "../../../../../../shared/db/schema/agent";
import { skill, agentSkill } from "../../../../../../shared/db/schema/skill";
import { eq } from "drizzle-orm";
import { getDomainConfig, type AgentType } from "../../../../../../shared/lib/agents/config";

interface SkillFile {
  filename: string;
  size: number;
  contentType: string;
  contentB64: string;
}

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
  const fullSystemPrompt = domainCfg.boundaryPreamble + agentRecord.systemPrompt;

  const linkedSkillsRaw = await db
    .select({
      name: skill.name,
      description: skill.description,
      instructions: skill.instructions,
      files: skill.files,
    })
    .from(agentSkill)
    .innerJoin(skill, eq(agentSkill.skillId, skill.id))
    .where(eq(agentSkill.agentId, agentId));

  const skills = linkedSkillsRaw.map((s) => {
    const files = ((s.files as SkillFile[]) ?? [])
      .filter(
        (f) =>
          f &&
          typeof f.filename === "string" &&
          typeof f.contentB64 === "string" &&
          !f.filename.includes("..") &&
          !f.filename.startsWith("/") &&
          f.filename.toUpperCase() !== "SKILL.MD",
      )
      .map((f) => ({ filename: f.filename, contentB64: f.contentB64 }));
    return {
      name: s.name,
      description: s.description,
      instructions: s.instructions,
      files,
    };
  });

  return NextResponse.json({ systemPrompt: fullSystemPrompt, skills });
}
