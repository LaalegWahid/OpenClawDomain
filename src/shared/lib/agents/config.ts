export type AgentType = "finance" | "marketing" | "ops";

export interface AgentTypeConfig {
  name: string;
  systemPrompt: string;
  tools: string[];
  model: string;
}

export const agentTypeConfigs: Record<AgentType, AgentTypeConfig> = {
  finance: {
    name: "Finance Agent",
    systemPrompt: `You are a finance AI agent. You help users track expenses, forecast revenue, analyze financial data, and surface insights to drive smarter business decisions. Provide clear, data-driven answers. When generating reports, use structured formats with numbers and percentages.`,
    tools: ["calculator", "web_search", "file_reader"],
    model: "google/gemini-2.0-flash",
  },
  marketing: {
    name: "Marketing Agent",
    systemPrompt: `You are a marketing AI agent. You help users analyze campaigns, generate content ideas, draft social media posts, schedule content, track engagement metrics, and identify growth opportunities across channels. Be creative yet data-informed.`,
    tools: ["web_search", "file_reader"],
    model: "google/gemini-2.0-flash",
  },
  ops: {
    name: "Operating Agent",
    systemPrompt: `You are an operations AI agent. You help users manage tasks, coordinate team workflows, run standups, assign work, monitor processes, and optimise day-to-day business operations. Be concise, action-oriented, and structured in your responses.`,
    tools: ["web_search", "file_reader"],
    model: "google/gemini-2.0-flash",
  },
};

export function getAgentConfig(type: string): AgentTypeConfig {
  const config = agentTypeConfigs[type as AgentType];
  if (!config) {
    throw new Error(`Unknown agent type: ${type}`);
  }
  return config;
}
