import {
  ECSClient,
  RunTaskCommand,
  StopTaskCommand,
  DescribeTasksCommand,
} from "@aws-sdk/client-ecs";
import { logger } from "../logger";
import { DOMAIN_CONFIGS, type AgentType } from "./config";

const ecs = new ECSClient({ region: process.env.AWS_REGION || "us-west-1" });

/**
 * Replaces common non-Latin1 unicode characters with ASCII equivalents,
 * then strips any remaining characters > 255.
 *
 * Required because the AWS SDK uses the Web Fetch API's Headers constructor
 * which throws `TypeError: Cannot convert argument to a ByteString` for any
 * character value > 255 in a value that passes through the HTTP layer.
 */
function sanitizeForEcs(text: string): string {
  return text
    .replace(/\u2014/g, "--")        // em-dash —
    .replace(/\u2013/g, "-")         // en-dash –
    .replace(/\u2018|\u2019/g, "'")  // smart single quotes ‘ ’
    .replace(/\u201C|\u201D/g, '"')  // smart double quotes “ ”
    .replace(/\u2026/g, "...")       // ellipsis …
    .replace(/\u00A0/g, " ")         // non-breaking space
    .replace(/[^\x00-\xFF]/g, "?");  // strip any remaining non-Latin1 chars
}

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
  whatsapp?: { enabled: true };
}

export interface McpServerConfig {
  transport: "stdio" | "http";
  config: Record<string, unknown>;
}

export async function launchContainer(
  userId: string,
  agentId: string,
  systemPrompt: string,
  agentType: AgentType,
  channels?: ChannelConfig,
  mcpServers?: Record<string, McpServerConfig>,
): Promise<LaunchResult> {
  if (process.env.LOCAL_DEV === "true") {
    const { localLaunchContainer } = await import("./docker.local");
    return localLaunchContainer(userId, agentId, systemPrompt, agentType, channels, mcpServers);
  }
  const domainConfig = DOMAIN_CONFIGS[agentType];
  const fullSystemPrompt = sanitizeForEcs(domainConfig.boundaryPreamble + systemPrompt);

  logger.info({ agentId, agentType }, "Launching ECS agent task");

  const extraEnv: { name: string; value: string }[] = [];

  if (channels?.whatsapp?.enabled) {
    // Credentials live on EFS (written by the WhatsApp linker task).
    // We only need to tell the entrypoint to enable the channel in openclaw.json.
    extraEnv.push({ name: "WHATSAPP_ENABLED", value: "true" });
  }
  if (mcpServers && Object.keys(mcpServers).length > 0) {
    const mcpConfigB64 = Buffer.from(JSON.stringify(mcpServers)).toString("base64");
    extraEnv.push({ name: "MCP_CONFIG_B64", value: mcpConfigB64 });
  }

  const result = await ecs.send(new RunTaskCommand({
    cluster: getCluster(),
    taskDefinition: `openclawmanager-agent-${agentType}`,
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
          { name: "AGENT_ID",      value: agentId },
          { name: "AGENT_TYPE",    value: agentType },
          { name: "SYSTEM_PROMPT", value: fullSystemPrompt },
          { name: "OPENCLAW_HOME", value: `/home/node/.openclaw/${userId}/${agentId}` },
          { name: "AGENT_MODEL",   value: process.env.AGENT_MODEL ?? "openrouter/qwen/qwen3.6-plus:free" },
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
  agentType: AgentType,
): Promise<string> {
  if (process.env.LOCAL_DEV === "true") {
    const { localLaunchWhatsappLinker } = await import("./docker.local");
    return localLaunchWhatsappLinker(userId, agentId);
  }
  const webhookBaseUrl = process.env.WEBHOOK_BASE_URL;
  if (!webhookBaseUrl) throw new Error("WEBHOOK_BASE_URL is not set");

  const result = await ecs.send(new RunTaskCommand({
    cluster: getCluster(),
    taskDefinition: `openclawmanager-agent-${agentType}`,
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
          { name: "OPENCLAW_MODE",   value: "whatsapp_link" },
          { name: "AGENT_ID",        value: agentId },
          { name: "OPENCLAW_HOME",   value: `/home/node/.openclaw/${userId}/${agentId}` },
          { name: "WEBHOOK_BASE_URL", value: webhookBaseUrl },
          { name: "GATEWAY_TOKEN",   value: getGatewayToken() },
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

// ─── Core gateway caller ──────────────────────────────────────────────────────

async function callGateway(baseUrl: string, input: unknown, timeoutMs: number): Promise<{ output: OutputItem[] }> {
  const res = await fetch(`${baseUrl}/v1/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getGatewayToken()}`,
      "x-openclaw-agent-id": "main",
    },
    body: JSON.stringify({ model: "openclaw", input }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "unable to read body");
    logger.error({ status: res.status, errorBody }, "Gateway error response");
    throw new Error(`Gateway responded ${res.status}: ${errorBody}`);
  }
  return res.json();
}

// ─── Agentic tool loop ────────────────────────────────────────────────────────
//
// OpenClaw returns function_call items when the agent wants to use a tool.
// We must feed the result back as function_call_output and keep looping
// until we get a plain message output — otherwise tool calls silently fail.
//
// We don't actually execute the tools ourselves (web_search, file_reader etc.
// run INSIDE the agent container). We just need to handle the loop so OpenClaw
// can complete its internal multi-step execution and return the final text.
//
// The loop has a max of 8 iterations to prevent runaway tool chains.

async function runAgentLoop(
  baseUrl: string,
  initialInput: unknown,
  timeoutMs: number,
): Promise<string> {
  const MAX_ITERATIONS = 8;
  let input = initialInput;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const data = await callGateway(baseUrl, input, timeoutMs);
    const output: OutputItem[] = data.output ?? [];

    // Collect any text from message items
    const textParts = output
      .filter((item): item is Extract<OutputItem, { type: "message" }> => item.type === "message")
      .flatMap((item) =>
        item.content
          .filter((c) => c.type === "output_text")
          .map((c) => c.text)
      );

    // Check for pending tool calls
    const toolCalls = output.filter(
      (item): item is Extract<OutputItem, { type: "function_call" }> =>
        item.type === "function_call"
    );

    if (toolCalls.length === 0) {
      // No tool calls — we're done
      if (textParts.length > 0) return textParts.join("\n");

      // Fallback for non-standard response shapes
      const d = data as Record<string, unknown>;
      if (typeof d.output_text === "string") return d.output_text;
      if (typeof d.response === "string") return d.response;
      return JSON.stringify(data);
    }

    // There are tool calls — build the next input by appending the output
    // items (including the function_call items) plus function_call_output
    // stubs. OpenClaw executes the tools internally; we just need to
    // acknowledge them so the loop can continue.
    //
    // Note: the output array from this turn becomes part of the next input,
    // which is how the OpenResponses API tracks conversation state.
    const toolResults: OutputItem[] = toolCalls.map((call) => ({
      type: "function_call_output" as const,
      call_id: call.id,
      // Empty string signals "tool ran, no output to inject" —
      // the agent's internal tool execution already happened inside OpenClaw.
      output: "",
    }));

    // Next input = prior output items + tool result acknowledgements
    input = [...output, ...toolResults];

    logger.info(
      { iteration: i + 1, toolCalls: toolCalls.map((c) => c.name) },
      "Agent tool loop continuing"
    );
  }

  throw new Error("Agent tool loop exceeded maximum iterations");
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Send a regular chat message to the agent.
 */
export async function sendCommand(
  taskArn: string,
  command: string,
  history?: ChatMessage[],
  agentType?: AgentType,
): Promise<string> {
  const baseUrl = await getContainerBaseUrl(taskArn);

  let input: unknown;

  // Use structured input array when we have history or an agentType reminder,
  // plain string for simple single-turn messages
  if (history && history.length > 0 || agentType) {
    type InputItem = { type: "message"; role: "developer" | "user" | "assistant"; content: string };

    const items: InputItem[] = [];

    if (agentType) {
      const domainConfig = DOMAIN_CONFIGS[agentType];
      items.push({
        type: "message",
        role: "developer",
        content: `[REMINDER: You are a ${domainConfig.label}. If the question is NOT about ${agentType}, refuse politely.]`,
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

  return runAgentLoop(baseUrl, input, 60_000);
}

/**
 * Send a document generation request.
 * Uses the developer role to put the agent into document-writer mode,
 * which prevents it from hallucinating file-save operations.
 */
export async function sendDocumentCommand(
  taskArn: string,
  developerInstruction: string,
  contentPrompt: string,
  history?: ChatMessage[],
): Promise<string> {
  const baseUrl = await getContainerBaseUrl(taskArn);

  type InputItem = { type: "message"; role: "developer" | "user" | "assistant"; content: string };

  const items: InputItem[] = [
    { type: "message", role: "developer", content: developerInstruction },
  ];

  // Include recent history so "write a report about what we discussed" works
  if (history && history.length > 0) {
    for (const msg of history.slice(-10)) {
      items.push({ type: "message", role: msg.role, content: msg.content });
    }
  }

  items.push({ type: "message", role: "user", content: contentPrompt });

  return runAgentLoop(baseUrl, items, 90_000);
}