// shared/lib/agents/docker.ts
import {
  ECSClient,
  RunTaskCommand,
  StopTaskCommand,
  DescribeTasksCommand,
} from "@aws-sdk/client-ecs"
import { logger } from "@/shared/lib/logger"
import { DOMAIN_CONFIGS, type AgentType } from "./config"

const ecs = new ECSClient({ region: process.env.AWS_REGION || "us-west-1" })

const CLUSTER        = process.env.ECS_CLUSTER_ARN!
const SUBNETS        = process.env.PRIVATE_SUBNET_IDS!.split(",")
const SECURITY_GROUP = process.env.ECS_TASKS_SG_ID!
const GATEWAY_TOKEN  = process.env.GATEWAY_TOKEN || "openclaw-agent-token"

export interface LaunchResult {
  containerId: string  // ECS task ARN
  port: number         // always 18789, no more random ports
}

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export async function launchContainer(
  userId: string,
  agentId: string,
  systemPrompt: string,
  agentType: AgentType,
): Promise<LaunchResult> {
  const domainConfig = DOMAIN_CONFIGS[agentType]
  const fullSystemPrompt = domainConfig.boundaryPreamble + systemPrompt

  logger.info({ agentId, agentType }, "Launching ECS agent task")

  const result = await ecs.send(new RunTaskCommand({
    cluster:        CLUSTER,
    taskDefinition: `openclaw-agent-${agentType}`,
    capacityProviderStrategy: [
      { capacityProvider: "FARGATE",      base: 1, weight: 1 },
      { capacityProvider: "FARGATE_SPOT", base: 0, weight: 3 },
    ],
    networkConfiguration: {
      awsvpcConfiguration: {
        subnets:        SUBNETS,
        securityGroups: [SECURITY_GROUP],
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
          // Each user/agent gets isolated subdirectory on EFS
          { name: "OPENCLAW_HOME", value: `/home/node/.openclaw/${userId}/${agentId}` },
        ],
      }],
    },
  }))

  const task = result.tasks?.[0]
  if (!task?.taskArn) {
    throw new Error(`ECS task failed to start: ${JSON.stringify(result.failures)}`)
  }

  logger.info({ taskArn: task.taskArn, agentId }, "ECS task started")

  return {
    containerId: task.taskArn,
    port: 18789,
  }
}

export async function stopContainer(taskArn: string): Promise<void> {
  try {
    logger.info({ taskArn }, "Stopping ECS task")
    await ecs.send(new StopTaskCommand({
      cluster: CLUSTER,
      task:    taskArn,
      reason:  "Stopped by user or idle timeout",
    }))
    logger.info({ taskArn }, "ECS task stopped")
  } catch {
    logger.warn({ taskArn }, "Task may already be stopped")
  }
}

export async function getContainerStatus(taskArn: string): Promise<string> {
  try {
    const result = await ecs.send(new DescribeTasksCommand({
      cluster: CLUSTER,
      tasks:   [taskArn],
    }))
    return result.tasks?.[0]?.lastStatus?.toLowerCase() ?? "not_found"
  } catch {
    return "not_found"
  }
}

export async function getContainerHealth(taskArn: string): Promise<boolean> {
  const status = await getContainerStatus(taskArn)
  return status === "running"
}

// Get private IP of a running ECS task
async function getTaskIp(taskArn: string): Promise<string> {
  const result = await ecs.send(new DescribeTasksCommand({
    cluster: CLUSTER,
    tasks:   [taskArn],
  }))

  const task = result.tasks?.[0]
  if (!task) throw new Error("Task not found")

  const privateIp = task.attachments
    ?.find(a => a.type === "ElasticNetworkInterface")
    ?.details
    ?.find(d => d.name === "privateIPv4Address")
    ?.value

  if (!privateIp) throw new Error("Could not resolve task private IP")
  return privateIp
}

export async function sendCommand(
  taskArn: string,       // was: port number
  command: string,
  history?: ChatMessage[],
  agentType?: AgentType,
): Promise<string> {
  const ip = await getTaskIp(taskArn)

  // Build input with history
  let input = command
  if (history && history.length > 0) {
    const contextLines = history.map(
      m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`
    )
    input = `[Conversation history]\n${contextLines.join("\n")}\n[End of history]\n\nUser: ${command}`
  }

  // Domain enforcement reminder
  if (agentType) {
    const domainConfig = DOMAIN_CONFIGS[agentType]
    input = `[REMINDER: You are a ${domainConfig.label}. Before responding, check: is this question about ${agentType}? If NOT, refuse with: "I'm a specialized ${domainConfig.label}. I can only assist with ${agentType}-related topics."]\n\n${input}`
  }

  const res = await fetch(`http://${ip}:18789/v1/responses`, {
    method: "POST",
    headers: {
      "Content-Type":        "application/json",
      "Authorization":       `Bearer ${GATEWAY_TOKEN}`,
      "x-openclaw-agent-id": "main",
    },
    body: JSON.stringify({
      model:  "openclaw",
      input,
      stream: false,
    }),
    signal: AbortSignal.timeout(60000),
  })

  if (!res.ok) throw new Error(`Agent command failed: ${res.status}`)

  const data = await res.json()

  if (data.output && Array.isArray(data.output)) {
    const textParts = data.output
      .filter((item: { type: string }) => item.type === "message")
      .flatMap((item: { content: { type: string; text: string }[] }) =>
        item.content
          .filter((c: { type: string }) => c.type === "output_text")
          .map((c: { text: string }) => c.text)
      )
    if (textParts.length > 0) return textParts.join("\n")
  }

  return data.output_text ?? data.response ?? JSON.stringify(data)
}