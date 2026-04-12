import { NextResponse } from "next/server";
import { db } from "../../../../../../shared/lib/drizzle";
import { agent } from "../../../../../../shared/db/schema/agent";
import { skill, agentSkill } from "../../../../../../shared/db/schema/skill";
import { eq } from "drizzle-orm";
import { getDomainConfig, type AgentType } from "../../../../../../shared/lib/agents/config";
import { getSkillFileUrl } from "../../../../../../shared/lib/s3/skills";

interface SkillFile {
  key: string;
  filename: string;
  size: number;
  contentType: string;
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

  const skills = await Promise.all(
    linkedSkillsRaw.map(async (s) => {
      const files = ((s.files as SkillFile[]) ?? []).filter(
        (f) => !f.filename.includes("..") && !f.filename.startsWith("/"),
      );
      const filesWithUrls = await Promise.all(
        files.map(async (f) => ({ filename: f.filename, url: await getSkillFileUrl(f.key) })),
      );
      return {
        name: s.name,
        description: s.description,
        instructions: s.instructions,
        files: filesWithUrls,
      };
    }),
  );

  return NextResponse.json({ systemPrompt: fullSystemPrompt, skills });
}
