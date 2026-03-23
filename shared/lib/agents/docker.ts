import {
  ECSClient,
  RunTaskCommand,
  StopTaskCommand,
  DescribeTasksCommand,
} from "@aws-sdk/client-ecs";
import { logger } from "../logger";
import { DOMAIN_CONFIGS, type AgentType } from "./config";

const ecs = new ECSClient({ region: process.env.AWS_REGION || "us-west-1" });

function getCluster(): string {
  const v = process.env.ECS_CLUSTER_ARN;
  if (!v) throw new Error("ECS_CLUSTER_ARN is not set");
  return v;
}

function getSubnets(): string[] {
  const v = process.env.PRIVATE_SUBNET_IDS;
  if (!v) throw new Error("PRIVATE_SUBNET_IDS is not set");
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

export async function launchContainer(
  userId: string,
  agentId: string,
  systemPrompt: string,
  agentType: AgentType,
): Promise<LaunchResult> {
  const domainConfig = DOMAIN_CONFIGS[agentType];
  const fullSystemPrompt = domainConfig.boundaryPreamble + systemPrompt;

  logger.info({ agentId, agentType }, "Launching ECS agent task");

  const result = await ecs.send(new RunTaskCommand({
    cluster: getCluster(),
    taskDefinition: `openclaw-agent-${agentType}`,
    launchType: "FARGATE",
    networkConfiguration: {
      awsvpcConfiguration: {
        subnets: getSubnets(),
        securityGroups: [getSecurityGroup()],
        assignPublicIp: "DISABLED",
      },
    },
    overrides: {
  containerOverrides: [{
    name: "agent",
    environment: [
      { name: "AGENT_ID",      value: agentId },
      { name: "AGENT_TYPE",    value: agentType },
      { name: "SYSTEM_PROMPT", value: fullSystemPrompt },
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

export async function stopContainer(taskArn: string): Promise<void> {
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

async function getTaskIp(taskArn: string): Promise<string> {
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
  return privateIp;
}

export async function sendCommand(
  taskArn: string,
  command: string,
  history?: ChatMessage[],
  agentType?: AgentType,
): Promise<string> {
  const ip = await getTaskIp(taskArn);

  let input = command;
  if (history && history.length > 0) {
    const contextLines = history.map(
      (m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`
    );
    input = `[Conversation history]\n${contextLines.join("\n")}\n[End of history]\n\nUser: ${command}`;
  }

  if (agentType) {
    const domainConfig = DOMAIN_CONFIGS[agentType];
    input = `[REMINDER: You are a ${domainConfig.label}. If the question is NOT about ${agentType}, refuse.]\n\n${input}`;
  }

  const res = await fetch(`http://${ip}:18789/v1/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getGatewayToken()}`,
      "x-openclaw-agent-id": "main",
    },
    body: JSON.stringify({ model: "openclaw", input, stream: false }),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) throw new Error(`Agent command failed: ${res.status}`);

  const data = await res.json();

  if (data.output && Array.isArray(data.output)) {
    const textParts = data.output
      .filter((item: { type: string }) => item.type === "message")
      .flatMap((item: { content: { type: string; text: string }[] }) =>
        item.content
          .filter((c: { type: string }) => c.type === "output_text")
          .map((c: { text: string }) => c.text)
      );
    if (textParts.length > 0) return textParts.join("\n");
  }

  return data.output_text ?? data.response ?? JSON.stringify(data);
}