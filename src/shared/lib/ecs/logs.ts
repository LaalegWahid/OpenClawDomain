import {
  CloudWatchLogsClient,
  GetLogEventsCommand,
  ResourceNotFoundException,
} from "@aws-sdk/client-cloudwatch-logs";
import { env } from "../../config/env";

const LOGS_REGION = process.env.AGENT_LOG_REGION ?? "us-west-1";
const LOG_GROUP =
  process.env.AGENT_LOG_GROUP ?? "/ecs/openclawmanager/agents";
const CONTAINER_NAME = "agent";

const logsClient = new CloudWatchLogsClient({
  region: LOGS_REGION,
  credentials:
    env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
});

export interface LogLine {
  timestamp: string;
  message: string;
}

export interface AgentLogsResult {
  lines: LogLine[];
  logGroup: string;
  logStream: string;
  error: string | null;
  nextForwardToken: string | null;
}

export function taskIdFromArn(containerId: string): string | null {
  if (!containerId) return null;
  const tail = containerId.split("/").pop();
  return tail && tail.length > 0 ? tail : null;
}

function buildLogStreamName(agentType: string, taskId: string): string {
  return `finance/${CONTAINER_NAME}/${taskId}`;
}

export async function getAgentLogs(
  containerId: string,
  agentType: string,
  opts: { limit?: number; nextToken?: string } = {},
): Promise<AgentLogsResult> {
  const taskId = taskIdFromArn(containerId);
  const stream = taskId ? buildLogStreamName(agentType, taskId) : "";

  const base: AgentLogsResult = {
    lines: [],
    logGroup: LOG_GROUP,
    logStream: stream,
    error: null,
    nextForwardToken: null,
  };

  if (!taskId) {
    return { ...base, error: "Agent has no container ID yet." };
  }

  try {
    const res = await logsClient.send(
      new GetLogEventsCommand({
        logGroupName: LOG_GROUP,
        logStreamName: stream,
        limit: opts.limit ?? 500,
        startFromHead: false,
        nextToken: opts.nextToken,
      }),
    );

    const lines: LogLine[] = (res.events ?? []).map((e) => ({
      timestamp: e.timestamp ? new Date(e.timestamp).toISOString() : "",
      message: e.message ?? "",
    }));

    return {
      ...base,
      lines,
      nextForwardToken: res.nextForwardToken ?? null,
    };
  } catch (err) {
    if (err instanceof ResourceNotFoundException) {
      return {
        ...base,
        error: `No log stream "${stream}" — the task may never have started or logs have expired.`,
      };
    }
    const message = err instanceof Error ? err.message : "Failed to fetch logs";
    console.error("[ecs-logs] getAgentLogs failed:", message);
    return { ...base, error: message };
  }
}
