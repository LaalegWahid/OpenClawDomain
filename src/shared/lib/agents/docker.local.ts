import Dockerode from "dockerode";
import net from "net";
import path from "path";
import fs from "fs";
import { logger } from "../logger";
import type { ChannelConfig, LaunchResult, McpServerConfig } from "./docker";
import type { AgentType } from "./config";
import { DOMAIN_CONFIGS } from "./config";

const docker = new Dockerode();

const PORT_RANGE_START = 18789;
const PORT_RANGE_END = 18800;

function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(false));
    srv.listen({ host: "127.0.0.1", port }, () => srv.close(() => resolve(true)));
  });
}

async function localFindFreePort(): Promise<number> {
  for (let port = PORT_RANGE_START; port <= PORT_RANGE_END; port++) {
    if (await isPortFree(port)) return port;
  }
  throw new Error(`No free ports available in range ${PORT_RANGE_START}-${PORT_RANGE_END}`);
}

export async function localGetContainerPort(containerId: string): Promise<number> {
  const info = await docker.getContainer(containerId).inspect();
  const bindings = info.HostConfig.PortBindings?.["18789/tcp"];
  const hostPort = bindings?.[0]?.HostPort;
  if (!hostPort) throw new Error(`No port binding found for container ${containerId}`);
  return parseInt(hostPort, 10);
}

export async function localLaunchContainer(
  userId: string,
  agentId: string,
  systemPrompt: string,
  agentType: AgentType,
  channels?: ChannelConfig,
  mcpServers?: Record<string, McpServerConfig>,
): Promise<LaunchResult> {
  const domainConfig = DOMAIN_CONFIGS[agentType];
  const fullSystemPrompt = domainConfig.boundaryPreamble + systemPrompt;
  const image = process.env.LOCAL_AGENT_IMAGE;
  if (!image) throw new Error("LOCAL_AGENT_IMAGE is not set");

  const baseDir = path.resolve(process.env.LOCAL_OPENCLAW_HOME ?? "./local-agent-data");
  const hostHome = path.join(baseDir, userId, agentId);
  fs.mkdirSync(hostHome, { recursive: true });

  const env: string[] = [
    `AGENT_ID=${agentId}`,
    `AGENT_TYPE=${agentType}`,
    `SYSTEM_PROMPT=${fullSystemPrompt}`,
    `OPENCLAW_HOME=/home/node/.openclaw/${userId}/${agentId}`,
    `GATEWAY_TOKEN=${process.env.GATEWAY_TOKEN ?? ""}`,
  ];
  if (process.env.ANTHROPIC_API_KEY) env.push(`ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY}`);
  if (process.env.GEMINI_API_KEY) env.push(`GEMINI_API_KEY=${process.env.GEMINI_API_KEY}`);
  if (process.env.OPENROUTER_API_KEY) env.push(`OPENROUTER_API_KEY=${process.env.OPENROUTER_API_KEY}`);
  if (process.env.AGENT_MODEL) env.push(`AGENT_MODEL=${process.env.AGENT_MODEL}`);
  if (channels?.discord?.botToken) env.push(`DISCORD_BOT_TOKEN=${channels.discord.botToken}`);
  if (channels?.whatsapp?.enabled) env.push(`WHATSAPP_ENABLED=true`);
  if (mcpServers && Object.keys(mcpServers).length > 0) {
    env.push(`MCP_CONFIG_B64=${Buffer.from(JSON.stringify(mcpServers)).toString("base64")}`);
  }

  const port = await localFindFreePort();

  const container = await docker.createContainer({
    Image: image,
    Env: env,
    ExposedPorts: { "18789/tcp": {} },
    HostConfig: {
      PortBindings: { "18789/tcp": [{ HostIp: "127.0.0.1", HostPort: String(port) }] },
      Binds: [`${hostHome}:/home/node/.openclaw/${userId}/${agentId}`],
    },
    Labels: { "openclaw.agentId": agentId, "openclaw.local": "true" },
  });
  await container.start();
  logger.info({ containerId: container.id, agentId, port }, "Local Docker agent started");
  return { containerId: container.id, port };
}

export async function localStopContainer(containerId: string): Promise<void> {
  try {
    const c = docker.getContainer(containerId);
    await c.stop({ t: 5 });
    await c.remove({ force: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("No such container") && !msg.includes("not running")) {
      logger.warn({ containerId, err }, "Could not stop local container");
    }
  }
}

export async function localGetContainerStatus(containerId: string): Promise<string> {
  try {
    const info = await docker.getContainer(containerId).inspect();
    const state = info.State.Status;
    if (state === "running") return "running";
    if (state === "exited" || state === "dead") return "stopped";
    return state;
  } catch {
    return "not_found";
  }
}

export async function localWaitForContainerRunning(
  containerId: string,
  timeoutMs = 60000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = await localGetContainerStatus(containerId);
    if (status === "running") return;
    if (status === "stopped" || status === "not_found") throw new Error(`Local container failed: ${status}`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Timed out waiting for local container to start");
}
