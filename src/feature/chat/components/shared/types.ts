export interface ChatDocument {
  data: string;
  filename: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  document?: ChatDocument;
}

export interface AgentOption {
  id: string;
  name: string;
  status: string;
  type?: string;
}
