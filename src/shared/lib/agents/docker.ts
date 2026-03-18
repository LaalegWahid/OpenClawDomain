import { exec } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { logger } from "@/shared/lib/logger";

const execAsync = promisify(exec);

const AGENT_DATA_DIR = process.env.AGENT_DATA_DIR || "./data/agents";
const GATEWAY_PORT = 18789;
const GATEWAY_TOKEN = "openclaw-agent-token";

interface LaunchResult {
  containerId: string;
  port: number;
}

import Dockerode from 'dockerode'

const docker = new Dockerode(
  process.platform === 'win32'
    ? { socketPath: '//./pipe/docker_engine' }
    : { socketPath: '/var/run/docker.sock' }
)

async function findAvailablePort(): Promise<number> {
  const min = 10000
  const max = 60000
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export async function launchContainer(
  userId: string,
  agentId: string,
  systemPrompt: string,
): Promise<LaunchResult> {
  const dataDir = path.resolve(AGENT_DATA_DIR, userId, agentId)

  await mkdir(dataDir, { recursive: true })

  const agentConfig = {
    model: "google/gemini-2.5-flash-lite",
    systemPrompt,
    tools: ["web_search", "file_reader"],
  }
  await writeFile(
    path.join(dataDir, 'config.json'),
    JSON.stringify(agentConfig, null, 2),
  )

  const port = await findAvailablePort()

  const container = await docker.createContainer({
    Image: 'openclaw-agent:latest',
    name: `agent-${agentId}`,
    Env: [
      `AWS_ACCESS_KEY_ID=${process.env.AWS_ACCESS_KEY_ID || ''}`,
      `AWS_SECRET_ACCESS_KEY=${process.env.AWS_SECRET_ACCESS_KEY || ''}`,
      `GEMINI_API_KEY=${process.env.GEMINI_API_KEY || ''}`,
      `AWS_REGION=${process.env.AWS_REGION || 'us-east-1'}`,
      `AGENT_ID=${agentId}`,
    ],
    ExposedPorts: {
      '18789/tcp': {},
    },
    HostConfig: {
      PortBindings: {
        '18789/tcp': [{ HostPort: String(port) }],
      },
      Binds: [`${dataDir}:/home/node/.openclaw`],
    },
  })

  await container.start()

  const containerId = container.id.substring(0, 12)
  return { containerId, port }
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
    signal: AbortSignal.timeout(60000),
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
