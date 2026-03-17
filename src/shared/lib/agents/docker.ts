import { exec } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getAgentConfig } from "./config";

const execAsync = promisify(exec);

const AGENT_DATA_DIR = process.env.AGENT_DATA_DIR || "./data/agents";
const AGENT_IMAGE = "openclaw-agent:latest";
const GATEWAY_PORT = 18789;
const GATEWAY_TOKEN = "openclaw-agent-token";

interface LaunchResult {
  containerId: string;
  port: number;
}

async function findAvailablePort(): Promise<number> {
  const min = 10000;
  const max = 60000;
  return Math.floor(Math.random() * (max - min + 1)) + min;
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

  const port = await findAvailablePort();

  const envVars = [
    `-e AWS_ACCESS_KEY_ID=${process.env.AWS_ACCESS_KEY_ID || ""}`,
    `-e AWS_SECRET_ACCESS_KEY=${process.env.AWS_SECRET_ACCESS_KEY || ""}`,
    `-e AWS_REGION=${process.env.AWS_REGION || "us-east-1"}`,
    `-e AGENT_ID=${agentId}`,
    `-e AGENT_TYPE=${agentType}`,
  ].join(" ");

  const cmd = [
    "docker run -d",
    `--name agent-${agentId}`,
    `-p ${port}:${GATEWAY_PORT}`,
    `-v "${dataDir}:/home/node/.openclaw"`,
    envVars,
    AGENT_IMAGE,
  ].join(" ");

  const { stdout } = await execAsync(cmd);
  const containerId = stdout.trim().substring(0, 12);

  return { containerId, port };
}

export async function stopContainer(containerId: string): Promise<void> {
  try {
    await execAsync(`docker stop ${containerId}`);
    await execAsync(`docker rm ${containerId}`);
  } catch {
    // Container may already be stopped/removed
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
