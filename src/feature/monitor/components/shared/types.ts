export interface LogEntry {
  id: string;
  agentId: string;
  agentName: string;
  source: string;
  status: string;
  userPrompt: string;
  assistantResponse: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  durationMs: number | null;
  createdAt: string;
  completedAt: string | null;
}

export interface Stats {
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalRequests: number;
  avgDurationMs: number;
}
