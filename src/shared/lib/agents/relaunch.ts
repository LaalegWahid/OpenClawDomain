import { db } from "../drizzle";
import { agent, agentChannel, agentMcp } from "../../db/schema/agent";
import { skill, agentSkill } from "../../db/schema/skill";
import { eq } from "drizzle-orm";
import { launchContainer, stopContainer, waitForTaskRunning } from "./docker";
import type { ChannelConfig, McpServerConfig } from "./docker";
import { logger } from "../logger";
import type { AgentType } from "./config";

/**
 * Stops the agent's current ECS task and relaunches it with the full set of
 * channel + MCP configs read fresh from the database.
 *
 * Call this after any add/remove of an agentChannel or agentMcp record so the
 * running container picks up the change.
 */
export async function relaunchAgentWithChannels(agentId: string): Promise<void> {
  // ── 1. Fetch agent ────────────────────────────────────────────────────────
  const [agentRecord] = await db
    .select()
    .from(agent)
    .where(eq(agent.id, agentId))
    .limit(1);

  if (!agentRecord) throw new Error(`Agent ${agentId} not found`);

  // ── 2. Fetch all channels ─────────────────────────────────────────────────
  const channels = await db
    .select()
    .from(agentChannel)
    .where(eq(agentChannel.agentId, agentId));

  // ── 3. Fetch all enabled MCP servers ──────────────────────────────────────
  const mcpRows = await db
    .select()
    .from(agentMcp)
    .where(eq(agentMcp.agentId, agentId));

  // ── 4. Build channel config ───────────────────────────────────────────────
  const channelConfig: ChannelConfig = {};

  // Primary platform — the agent was originally created with this platform
  const username = agentRecord.botUsername ?? "";
  // Note: Discord is intentionally excluded — Next.js manages Discord via manager.ts.
  // The Discord agentChannel record stays in DB for initAllDiscordBots() on startup.
  const waChannel = channels.find((ch) => ch.platform === "whatsapp");
  const waCredentials = (waChannel?.credentials ?? {}) as { ownerJid?: string };

  if (username.startsWith("whatsapp_")) {
    channelConfig.whatsapp = {
      enabled: true,
      ...(waCredentials.ownerJid ? { ownerJid: waCredentials.ownerJid } : {}),
    };
  }

  // Additional channels added later (Discord excluded — managed by Next.js)
  for (const ch of channels) {
    if (ch.platform === "whatsapp" && !channelConfig.whatsapp) {
      const creds = (ch.credentials ?? {}) as { ownerJid?: string };
      channelConfig.whatsapp = {
        enabled: true,
        ...(creds.ownerJid ? { ownerJid: creds.ownerJid } : {}),
      };
    }
  }

  // ── 5. Build MCP config ───────────────────────────────────────────────────
  const mcpConfig: Record<string, McpServerConfig> = {};
  for (const srv of mcpRows.filter((s) => s.enabled)) {
    mcpConfig[srv.serverName] = {
      transport: srv.transport as McpServerConfig["transport"],
      config: srv.config as Record<string, unknown>,
    };
  }

  // ── 5b. Fetch linked skills ───────────────────────────────────────────────
  const linkedSkills = await db
    .select({ name: skill.name, instructions: skill.instructions })
    .from(agentSkill)
    .innerJoin(skill, eq(agentSkill.skillId, skill.id))
    .where(eq(agentSkill.agentId, agentId));

  const skillInstructions = linkedSkills.length > 0
    ? linkedSkills.map((s) => `## ${s.name}\n${s.instructions}`).join("\n\n")
    : undefined;

  // ── 6. Stop old container ─────────────────────────────────────────────────
  if (agentRecord.containerId) {
    await stopContainer(agentRecord.containerId);
  }

  // ── 7. Relaunch with full config ──────────────────────────────────────────
  const { containerId } = await launchContainer(
    agentRecord.userId,
    agentId,
    agentRecord.systemPrompt,
    agentRecord.type as AgentType,
    channelConfig,
    Object.keys(mcpConfig).length > 0 ? mcpConfig : undefined,
    skillInstructions,
  );

  // ── 8. Update agent record ────────────────────────────────────────────────
  await db
    .update(agent)
    .set({ containerId, status: "starting" })
    .where(eq(agent.id, agentId));

  // ── 9. Promote to active when running (fire-and-forget) ───────────────────
  waitForTaskRunning(containerId)
    .then(() =>
      db.update(agent).set({ status: "active" }).where(eq(agent.id, agentId)),
    )
    .catch(async (err) => {
      logger.error({ err, agentId }, "Relaunched task never reached RUNNING");
      await db.update(agent).set({ status: "error" }).where(eq(agent.id, agentId));
    });

  logger.info({ agentId, containerId }, "Agent relaunched with updated channels");
}
