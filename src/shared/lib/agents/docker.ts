// /docker.ts

import {
  ECSClient,
  RunTaskCommand,
  StopTaskCommand,
  DescribeTasksCommand,
} from "@aws-sdk/client-ecs";
import { logger } from "../logger";
import { getDomainConfig, type AgentType } from "./config";

const ecs = new ECSClient({ region: process.env.AWS_REGION || "us-west-1" });

const TASK_DEFINITION = process.env.ECS_TASK_DEFINITION ?? "openclawmanager-agent";

function getCluster(): string {
  const v = process.env.ECS_CLUSTER_ARN;
  if (!v) throw new Error("ECS_CLUSTER_ARN is not set");
  return v;
}

function getSubnets(): string[] {
  const v = process.env.PUBLIC_SUBNET_IDS || process.env.PRIVATE_SUBNET_IDS;
  if (!v) throw new Error("No subnet IDs configured");
  return v.split(",");
}

function getSecurityGroup(): string {
  const v = process.env.ECS_TASKS_SG_ID;
  if (!v) throw new Error("ECS_TASKS_SG_ID is not set");
  return v;
}

function getGatewayToken(): string {
  const v = process.env.GATEWAY_TOKEN;
  if (!v) throw new Error("GATEWAY_TOKEN is not set");
  return v;
}

export interface LaunchResult {
  containerId: string;
  port: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Mirrors the OpenResponses output item shape
type OutputItem =
  | { type: "message"; content: { type: string; text: string }[] }
  | { type: "function_call"; id: string; name: string; arguments: string }
  | { type: "function_call_output"; call_id: string; output: string };

export async function waitForTaskRunning(
  taskArn: string,
  timeoutMs = 120000
): Promise<void> {
  if (process.env.LOCAL_DEV === "true") {
    const { localWaitForContainerRunning } = await import("./docker.local");
    return localWaitForContainerRunning(taskArn, timeoutMs);
  }
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await ecs.send(new DescribeTasksCommand({
      cluster: getCluster(),
      tasks: [taskArn],
    }));
    const status = result.tasks?.[0]?.lastStatus;
    if (status === "RUNNING") return;
    if (status === "STOPPED" || status === "DEPROVISIONING") {
      throw new Error(`Task failed: ${status}`);
    }
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error("Timed out waiting for task to start");
}

export interface ChannelConfig {
  discord?: { botToken: string };
  /** Baileys/QR-based WhatsApp — credentials live on EFS, we just enable the channel */
  whatsapp?: { enabled: true; allowFrom?: string[] };
}

/**
 * MCP server config in the shape OpenClaw expects (flat, no wrapper).
 * Stdio: { command: "npx", args: ["@modelcontextprotocol/server-github"] }
 */
export type McpServerConfig = Record<string, unknown>;

/**
 * Maps a provider slug to the env-var name the container expects.
 */
/**
 * Maps the provider slug (from the frontend/DB) to the env var the container expects.
 * The OpenClaw gateway natively supports: anthropic, google, openai, openrouter.
 * All other providers (groq, mistral, xai, etc.) are accessed via OpenRouter.
 */
const PROVIDER_ENV_MAP: Record<string, string> = {
  anthropic:  "ANTHROPIC_API_KEY",
  google:     "GEMINI_API_KEY",
  openai:     "OPENAI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
};

/**
 * Maps provider slugs to the gateway routing prefix for model IDs.
 * The gateway expects "prefix/model" format (e.g. "anthropic/claude-4.6-sonnet").
 * OpenRouter models already include their prefix (e.g. "groq/compound-beta").
 */
const PROVIDER_MODEL_PREFIX: Record<string, string> = {
  anthropic: "anthropic",
  google:    "google",
  openai:    "openai",
};

/**
 * Per-agent API config (already decrypted).
 * One provider + one key per agent.
 */
export interface AgentApiKeys {
  apiProvider?: string;   // e.g. "anthropic", "mistral"
  apiKey?: string;        // the decrypted secret
  agentModel?: string;    // e.g. "claude-sonnet-4-20250514"
}

export async function launchContainer(
  userId: string,
  agentId: string,
  agentType: AgentType,
  channels?: ChannelConfig,
  mcpServers?: Record<string, McpServerConfig>,
  apiKeys?: AgentApiKeys,
): Promise<LaunchResult> {
  if (process.env.LOCAL_DEV === "true") {
    const { localLaunchContainer } = await import("./docker.local");
    return localLaunchContainer(userId, agentId, agentType, channels, mcpServers);
  }

  logger.info({ agentId, agentType }, "Launching ECS agent task");

  const webhookBaseUrl = process.env.WEBHOOK_BASE_URL;
  if (!webhookBaseUrl) throw new Error("WEBHOOK_BASE_URL is not set");

  const extraEnv: { name: string; value: string }[] = [];

  if (channels?.whatsapp?.enabled) {
    extraEnv.push({ name: "WHATSAPP_ENABLED", value: "true" });
    extraEnv.push({
      name: "WHATSAPP_INBOUND_WEBHOOK_URL",
      value: `${webhookBaseUrl}/api/whatsapp/inbound/${agentId}`,
    });
    if (channels.whatsapp.allowFrom?.length) {
      extraEnv.push({ name: "WHATSAPP_ALLOW_FROM", value: channels.whatsapp.allowFrom.join(",") });
    }
  }

  if (channels?.discord?.botToken) {
    extraEnv.push({ name: "DISCORD_BOT_TOKEN", value: channels.discord.botToken });
  }

  if (mcpServers && Object.keys(mcpServers).length > 0) {
    const mcpConfigB64 = Buffer.from(JSON.stringify(mcpServers)).toString("base64");
    extraEnv.push({ name: "MCP_CONFIG_B64", value: mcpConfigB64 });
  }

  // Inject the agent's single provider key as the correct env var
  if (apiKeys?.apiProvider && apiKeys?.apiKey) {
    const envName = PROVIDER_ENV_MAP[apiKeys.apiProvider] ?? `${apiKeys.apiProvider.toUpperCase()}_API_KEY`;
    extraEnv.push({ name: envName, value: apiKeys.apiKey });
  }

  // Build the fully-qualified model ID the gateway expects ("provider/model").
  // Anthropic/Google models need their prefix added (e.g. "anthropic/claude-sonnet-4-6").
  // OpenRouter models already have a sub-provider prefix (e.g. "groq/compound-beta")
  // but still need the "openrouter/" top-level prefix for the gateway.
  let agentModel = apiKeys?.agentModel ?? process.env.AGENT_MODEL ?? "openrouter/qwen/qwen3-32b";
  if (apiKeys?.apiProvider && apiKeys?.agentModel) {
    const prefix = PROVIDER_MODEL_PREFIX[apiKeys.apiProvider];
    if (prefix) {
      // Native provider (anthropic, google): prefix/model
      agentModel = `${prefix}/${apiKeys.agentModel}`;
    } else if (apiKeys.apiProvider === "openrouter") {
      // OpenRouter: openrouter/subprovider/model
      agentModel = `openrouter/${apiKeys.agentModel}`;
    }
  }

  const result = await ecs.send(new RunTaskCommand({
    cluster: getCluster(),
    taskDefinition: TASK_DEFINITION,
    launchType: "FARGATE",
    networkConfiguration: {
      awsvpcConfiguration: {
        subnets: getSubnets(),
        securityGroups: [getSecurityGroup()],
        assignPublicIp: "ENABLED",
      },
    },
    overrides: {
      containerOverrides: [{
        name: "agent",
        environment: [
          { name: "AGENT_ID",         value: agentId },
          { name: "AGENT_TYPE",       value: agentType },
          { name: "AGENT_DATA_DIR",   value: `/home/node/.openclaw/${userId}/${agentId}` },
          { name: "AGENT_MODEL",      value: agentModel },
          { name: "WEBHOOK_BASE_URL", value: webhookBaseUrl },
          { name: "GATEWAY_TOKEN",    value: getGatewayToken() },
          ...extraEnv,
        ],
      }],
    },
  }));

  const task = result.tasks?.[0];
  if (!task?.taskArn) {
    throw new Error(`ECS task failed to start: ${JSON.stringify(result.failures)}`);
  }

  logger.info({ taskArn: task.taskArn, agentId }, "ECS task started");
  return { containerId: task.taskArn, port: 18789 };
}

export async function launchWhatsappLinker(
  userId: string,
  agentId: string,
): Promise<string> {
  if (process.env.LOCAL_DEV === "true") {
    const { localLaunchWhatsappLinker } = await import("./docker.local");
    return localLaunchWhatsappLinker(userId, agentId);
  }
  const webhookBaseUrl = process.env.WEBHOOK_BASE_URL;
  if (!webhookBaseUrl) throw new Error("WEBHOOK_BASE_URL is not set");

  const result = await ecs.send(new RunTaskCommand({
    cluster: getCluster(),
    taskDefinition: TASK_DEFINITION,
    launchType: "FARGATE",
    networkConfiguration: {
      awsvpcConfiguration: {
        subnets: getSubnets(),
        securityGroups: [getSecurityGroup()],
        assignPublicIp: "ENABLED",
      },
    },
    overrides: {
      containerOverrides: [{
        name: "agent",
        environment: [
          { name: "OPENCLAW_MODE",    value: "whatsapp_link" },
          { name: "AGENT_ID",         value: agentId },
          { name: "AGENT_DATA_DIR",   value: `/home/node/.openclaw/${userId}/${agentId}` },
          { name: "WEBHOOK_BASE_URL", value: webhookBaseUrl },
          { name: "GATEWAY_TOKEN",    value: getGatewayToken() },
        ],
      }],
    },
  }));

  const task = result.tasks?.[0];
  if (!task?.taskArn) {
    throw new Error(`Linker ECS task failed to start: ${JSON.stringify(result.failures)}`);
  }

  logger.info({ taskArn: task.taskArn, agentId }, "WhatsApp linker task started");
  return task.taskArn;
}

export async function stopContainer(taskArn: string): Promise<void> {
  if (process.env.LOCAL_DEV === "true") {
    const { localStopContainer } = await import("./docker.local");
    return localStopContainer(taskArn);
  }
  try {
    await ecs.send(new StopTaskCommand({
      cluster: getCluster(),
      task: taskArn,
      reason: "Stopped by user",
    }));
    logger.info({ taskArn }, "ECS task stopped");
  } catch {
    logger.warn({ taskArn }, "Task may already be stopped");
  }
}

export async function getContainerStatus(taskArn: string): Promise<string> {
  if (process.env.LOCAL_DEV === "true") {
    const { localGetContainerStatus } = await import("./docker.local");
    return localGetContainerStatus(taskArn);
  }
  try {
    const result = await ecs.send(new DescribeTasksCommand({
      cluster: getCluster(),
      tasks: [taskArn],
    }));
    return result.tasks?.[0]?.lastStatus?.toLowerCase() ?? "not_found";
  } catch {
    return "not_found";
  }
}

async function getContainerBaseUrl(taskArn: string): Promise<string> {
  if (process.env.LOCAL_DEV === "true") {
    const { localGetContainerPort } = await import("./docker.local");
    const port = await localGetContainerPort(taskArn);
    return `http://127.0.0.1:${port}`;
  }
  const result = await ecs.send(new DescribeTasksCommand({
    cluster: getCluster(),
    tasks: [taskArn],
  }));

  const task = result.tasks?.[0];
  if (!task) throw new Error("Task not found");

  const privateIp = task.attachments
    ?.find((a) => a.type === "ElasticNetworkInterface")
    ?.details
    ?.find((d) => d.name === "privateIPv4Address")
    ?.value;

  if (!privateIp) throw new Error("Could not resolve task private IP");
  return `http://${privateIp}:18789`;
}

// ─── Abort registry (per-log + per-chat) ─────────────────────────────────────

const activeAbortControllers = new Map<string, AbortController>();
// chat key ("agentId:chatId") → { controller, logId } for cancel-by-chat lookups.
const chatAbortControllers = new Map<string, { controller: AbortController; logId: string }>();

function chatKey(agentId: string, chatId: string): string {
  return `${agentId}:${chatId}`;
}

export function registerAbort(logId: string): AbortController {
  const controller = new AbortController();
  activeAbortControllers.set(logId, controller);
  return controller;
}

/**
 * Register an abort controller that can be looked up by either logId OR the
 * (agentId, chatId) pair. Used so a user-typed /cancel command can find the
 * in-flight request without knowing the logId.
 *
 * If a prior request for the same chat is still registered, it's aborted first
 * so only one in-flight request per chat is tracked.
 */
export function registerChatAbort(agentId: string, chatId: string, logId: string): AbortController {
  const key = chatKey(agentId, chatId);
  const prior = chatAbortControllers.get(key);
  if (prior) {
    prior.controller.abort();
    activeAbortControllers.delete(prior.logId);
    chatAbortControllers.delete(key);
  }
  const controller = new AbortController();
  activeAbortControllers.set(logId, controller);
  chatAbortControllers.set(key, { controller, logId });
  return controller;
}

export function abortTask(logId: string): boolean {
  const controller = activeAbortControllers.get(logId);
  if (controller) {
    controller.abort();
    activeAbortControllers.delete(logId);
    return true;
  }
  return false;
}

export function abortChat(agentId: string, chatId: string): { aborted: boolean; logId?: string } {
  const key = chatKey(agentId, chatId);
  const entry = chatAbortControllers.get(key);
  if (!entry) return { aborted: false };
  entry.controller.abort();
  activeAbortControllers.delete(entry.logId);
  chatAbortControllers.delete(key);
  return { aborted: true, logId: entry.logId };
}

export function cleanupAbort(logId: string) {
  activeAbortControllers.delete(logId);
}

export function cleanupChatAbort(agentId: string, chatId: string, logId: string) {
  activeAbortControllers.delete(logId);
  const key = chatKey(agentId, chatId);
  const entry = chatAbortControllers.get(key);
  if (entry && entry.logId === logId) {
    chatAbortControllers.delete(key);
  }
}

// ─── Core gateway caller ──────────────────────────────────────────────────────

export interface GatewayUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface GatewayResult {
  output: OutputItem[];
  usage: GatewayUsage;
}

async function callGateway(baseUrl: string, input: unknown, timeoutMs: number, signal?: AbortSignal): Promise<GatewayResult> {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal;

  const res = await fetch(`${baseUrl}/v1/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getGatewayToken()}`,
      "x-openclaw-agent-id": "main",
    },
    body: JSON.stringify({ model: "openclaw", input }),
    signal: combinedSignal,
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "unable to read body");
    logger.error({ status: res.status, errorBody }, "Gateway error response");
    throw new Error(`Gateway responded ${res.status}: ${errorBody}`);
  }
  const data = await res.json();

  const usage: GatewayUsage = {
    inputTokens: data.usage?.input_tokens ?? data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? data.usage?.completion_tokens ?? 0,
  };

  return { output: data.output ?? [], usage };
}

// ─── Agentic tool loop ────────────────────────────────────────────────────────

export interface AgentLoopResult {
  text: string;
  usage: GatewayUsage;
}

async function runAgentLoop(
  baseUrl: string,
  initialInput: unknown,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<AgentLoopResult> {
  const MAX_ITERATIONS = 8;
  let input = initialInput;
  const totalUsage: GatewayUsage = { inputTokens: 0, outputTokens: 0 };

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const data = await callGateway(baseUrl, input, timeoutMs, signal);
    totalUsage.inputTokens += data.usage.inputTokens;
    totalUsage.outputTokens += data.usage.outputTokens;
    const output: OutputItem[] = data.output ?? [];

    const textParts = output
      .filter((item): item is Extract<OutputItem, { type: "message" }> => item.type === "message")
      .flatMap((item) =>
        item.content
          .filter((c) => c.type === "output_text")
          .map((c) => c.text)
      );

    const toolCalls = output.filter(
      (item): item is Extract<OutputItem, { type: "function_call" }> =>
        item.type === "function_call"
    );

    if (toolCalls.length === 0) {
      let text: string;
      if (textParts.length > 0) {
        text = textParts.join("\n");
      } else {
        const d = data as unknown as Record<string, unknown>;
        if (typeof d.output_text === "string") text = d.output_text;
        else if (typeof d.response === "string") text = d.response;
        else text = JSON.stringify(data);
      }
      return { text, usage: totalUsage };
    }

    const toolResults: OutputItem[] = toolCalls.map((call) => ({
      type: "function_call_output" as const,
      call_id: call.id,
      output: "",
    }));

    input = [...output, ...toolResults];

    logger.info(
      { iteration: i + 1, toolCalls: toolCalls.map((c) => c.name) },
      "Agent tool loop continuing"
    );
  }

  throw new Error("Agent tool loop exceeded maximum iterations");
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function sendCommand(
  taskArn: string,
  command: string,
  history?: ChatMessage[],
  agentType?: AgentType,
  signal?: AbortSignal,
): Promise<AgentLoopResult> {
  const baseUrl = await getContainerBaseUrl(taskArn);

  let input: unknown;

  if (history && history.length > 0 || agentType) {
    type InputItem = { type: "message"; role: "developer" | "user" | "assistant"; content: string };

    const items: InputItem[] = [];

    if (agentType) {
      const domainCfg = await getDomainConfig(agentType);
      items.push({
        type: "message",
        role: "developer",
        content: `[REMINDER: You are a ${domainCfg.label}. If the question is NOT about ${agentType}, refuse politely.]`,
      });
    }

    if (history && history.length > 0) {
      for (const msg of history.slice(-10)) {
        items.push({ type: "message", role: msg.role, content: msg.content });
      }
    }

    items.push({ type: "message", role: "user", content: command });
    input = items;
  } else {
    input = command;
  }

  return runAgentLoop(baseUrl, input, 60_000, signal);
}

export async function sendDocumentCommand(
  taskArn: string,
  developerInstruction: string,
  contentPrompt: string,
  history?: ChatMessage[],
  signal?: AbortSignal,
): Promise<AgentLoopResult> {
  const baseUrl = await getContainerBaseUrl(taskArn);

  type InputItem = { type: "message"; role: "developer" | "user" | "assistant"; content: string };

  const items: InputItem[] = [
    { type: "message", role: "developer", content: developerInstruction },
  ];

  if (history && history.length > 0) {
    for (const msg of history.slice(-10)) {
      items.push({ type: "message", role: msg.role, content: msg.content });
    }
  }

  items.push({ type: "message", role: "user", content: contentPrompt });

  return runAgentLoop(baseUrl, items, 90_000, signal);
}