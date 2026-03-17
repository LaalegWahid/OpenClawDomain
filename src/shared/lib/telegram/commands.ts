import { db } from "@/shared/lib/drizzle";
import { user } from "@/shared/db/schema/auth";
import { agent } from "@/shared/db/schema/agent";
import { eq } from "drizzle-orm";
import { sendMessage } from "./bot";
import { sendCommand } from "@/shared/lib/agents/docker";

async function findUserByTelegramId(telegramId: string) {
  const [found] = await db
    .select()
    .from(user)
    .where(eq(user.telegramId, telegramId));
  return found ?? null;
}

async function getUserAgents(userId: string) {
  return db.select().from(agent).where(eq(agent.userId, userId));
}

function findAgentByType(agents: { type: string; status: string; containerPort: number | null }[], type: string) {
  return agents.find((a) => a.type === type && a.status === "active" && a.containerPort);
}

async function routeToAgent(
  chatId: string,
  agents: { type: string; status: string; containerPort: number | null }[],
  agentType: string,
  command: string,
) {
  const target = findAgentByType(agents, agentType);
  if (!target || !target.containerPort) {
    await sendMessage(chatId, `No active ${agentType} agent found. Launch one from the dashboard first.`);
    return;
  }

  try {
    const response = await sendCommand(target.containerPort, command);
    await sendMessage(chatId, response);
  } catch {
    await sendMessage(chatId, `Failed to reach ${agentType} agent. It may be starting up — try again shortly.`);
  }
}

export async function handleStatusCommand(chatId: string, telegramId: string) {
  const usr = await findUserByTelegramId(telegramId);
  if (!usr) {
    await sendMessage(chatId, "Please link your account first via the dashboard.");
    return;
  }

  const agents = await getUserAgents(usr.id);
  if (agents.length === 0) {
    await sendMessage(chatId, "No agents found. Launch agents from the dashboard.");
    return;
  }

  const lines = agents.map(
    (a) => `${a.name} (${a.type}) — ${a.status}`,
  );
  await sendMessage(chatId, `Your agents:\n\n${lines.join("\n")}`);
}

export async function handleAgentCommand(
  chatId: string,
  telegramId: string,
  agentType: string,
  command: string,
) {
  const usr = await findUserByTelegramId(telegramId);
  if (!usr) {
    await sendMessage(chatId, "Please link your account first via the dashboard.");
    return;
  }

  const agents = await getUserAgents(usr.id);
  await routeToAgent(chatId, agents, agentType, command);
}
