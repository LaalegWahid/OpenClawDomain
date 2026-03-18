import { exec } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getAgentConfig } from "./config";
import { logger } from "@/shared/lib/logger";

const execAsync = promisify(exec);

const AGENT_DATA_DIR = process.env.AGENT_DATA_DIR || "./data/agents";
const AGENT_IMAGE = "openclaw-agent:latest";
const GATEWAY_PORT = 18789;
const GATEWAY_TOKEN = "openclaw-agent-token";

interface LaunchResult {
  containerId: string;
  port: number;
}

export async function launchContainer(
  userId: string,
  agentType: string,
  agentId: string,
): Promise<LaunchResult> {
  const config = getAgentConfig(agentType);
  const dataDir = path.resolve(AGENT_DATA_DIR, userId, agentId);

  // Create data directory for this agent's ~/.openclaw
  await mkdir(dataDir, { recursive: true });

  // Write agent config (read by entrypoint to generate openclaw.json)
  const agentConfig = {
    model: config.model,
    systemPrompt: config.systemPrompt,
    tools: config.tools,
  };
  await writeFile(
    path.join(dataDir, "config.json"),
    JSON.stringify(agentConfig, null, 2),
  );

  const envVars = [
    `-e AWS_ACCESS_KEY_ID=${process.env.AWS_ACCESS_KEY_ID || ""}`,
    `-e AWS_SECRET_ACCESS_KEY=${process.env.AWS_SECRET_ACCESS_KEY || ""}`,
    `-e AWS_REGION=${process.env.AWS_REGION || "us-east-1"}`,
    `-e AGENT_ID=${agentId}`,
    `-e AGENT_TYPE=${agentType}`,
  ].join(" ");

  // Let Docker assign a free host port automatically
  const cmd = [
    "docker run -d",
    `--name agent-${agentId}`,
    `-p 0:${GATEWAY_PORT}`,
    `-v "${dataDir}:/home/node/.openclaw"`,
    envVars,
    AGENT_IMAGE,
  ].join(" ");

  logger.info({ agentId, agentType, userId }, "Launching container");
  const { stdout } = await execAsync(cmd);
  const containerId = stdout.trim().substring(0, 12);

  // Read back the actual port Docker assigned
  const { stdout: portOutput } = await execAsync(
    `docker port agent-${agentId} ${GATEWAY_PORT}`,
  );
  // Output format: "0.0.0.0:12345" or "0.0.0.0:12345\n:::12345"
  const port = parseInt(portOutput.trim().split(":").pop()!, 10);

  logger.info({ containerId, port, agentId }, "Container launched");
  return { containerId, port };
}

export async function stopContainer(containerId: string): Promise<void> {
  try {
    logger.info({ containerId }, "Stopping container");
    await execAsync(`docker stop ${containerId}`);
    await execAsync(`docker rm ${containerId}`);
    logger.info({ containerId }, "Container stopped and removed");
  } catch {
    logger.warn({ containerId }, "Container may already be stopped/removed");
  }
}

export async function getContainerStatus(
  containerId: string,
): Promise<string> {
  try {
    const { stdout } = await execAsync(
      `docker inspect --format="{{.State.Status}}" ${containerId}`,
    );
    return stdout.trim();
  } catch {
    return "not_found";
  }
}

export async function getContainerHealth(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://localhost:${port}/healthz`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendCommand(
  port: number,
  command: string,
): Promise<string> {
  const res = await fetch(`http://localhost:${port}/v1/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GATEWAY_TOKEN}`,
      "x-openclaw-agent-id": "main",
    },
    body: JSON.stringify({
      model: "openclaw",
      input: command,
      stream: false,
    }),
  });

  if (!res.ok) {
    throw new Error(`Agent command failed: ${res.status}`);
  }

  const data = await res.json();

  // Extract text from OpenResponses format
  if (data.output && Array.isArray(data.output)) {
    const textParts = data.output
      .filter((item: { type: string }) => item.type === "message")
      .flatMap((item: { content: { type: string; text: string }[] }) =>
        item.content
          .filter((c: { type: string }) => c.type === "output_text")
          .map((c: { text: string }) => c.text),
      );
    if (textParts.length > 0) return textParts.join("\n");
  }

  return data.output_text ?? data.response ?? JSON.stringify(data);
}
