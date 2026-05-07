import { NextResponse } from "next/server";
import { db } from "../../../../../../shared/lib/drizzle";
import { agent, agentTask, agentChannel, incomingMessage } from "../../../../../../shared/db/schema/agent";
import { skill, agentSkill } from "../../../../../../shared/db/schema/skill";
import { and, desc, eq } from "drizzle-orm";
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
    .select({ systemPrompt: agent.systemPrompt, type: agent.type, botUsername: agent.botUsername })
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

  // ── Scheduled tasks ─────────────────────────────────────────────────────────
  // We resolve the delivery target server-side so the entrypoint can pass
  // --channel/--to to `openclaw cron add` directly. v1: Telegram only.
  // The chat is the most-recent inbound for this agent on the implied platform.
  // Delivery channel is derived from agentChannel rows; if no Telegram channel
  // exists, we fall back to the legacy agent.botUsername prefix for older rows.
  const channelRows = await db
    .select({ platform: agentChannel.platform })
    .from(agentChannel)
    .where(eq(agentChannel.agentId, agentId));
  const hasTelegramChannel = channelRows.some((c) => c.platform === "telegram");

  let deliveryChannel: string | null = null;
  let deliverySource: "telegram" | "whatsapp" | null = null;
  if (hasTelegramChannel) {
    deliveryChannel = "telegram";
    deliverySource = "telegram";
  } else {
    const username = agentRecord.botUsername ?? "";
    if (username && !username.startsWith("whatsapp_") && !username.startsWith("discord_")) {
      // Legacy Telegram-at-creation row.
      deliveryChannel = "telegram";
      deliverySource = "telegram";
    }
  }

  let deliveryTo: string | null = null;
  if (deliverySource) {
    const [latest] = await db
      .select({ chatId: incomingMessage.chatId })
      .from(incomingMessage)
      .where(and(eq(incomingMessage.agentId, agentId), eq(incomingMessage.source, deliverySource)))
      .orderBy(desc(incomingMessage.createdAt))
      .limit(1);
    deliveryTo = latest?.chatId ?? null;
  }

  const taskRows = await db
    .select({
      id: agentTask.id,
      name: agentTask.name,
      prompt: agentTask.prompt,
      cronExpr: agentTask.cronExpr,
      timezone: agentTask.timezone,
      sessionMode: agentTask.sessionMode,
      enabled: agentTask.enabled,
    })
    .from(agentTask)
    .where(and(eq(agentTask.agentId, agentId), eq(agentTask.enabled, true)));

  const tasks = taskRows.map((t) => ({
    id: t.id,
    name: t.name,
    prompt: t.prompt,
    cron: t.cronExpr,
    tz: t.timezone,
    session: t.sessionMode,
    channel: deliveryChannel,
    to: deliveryTo,
  }));

  return NextResponse.json({ systemPrompt: fullSystemPrompt, skills, tasks });
}
