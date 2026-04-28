import type { AgentOption, ChatDocument, ChatMessage } from "../components/shared/types";

export async function fetchAgents(): Promise<AgentOption[]> {
  const res = await fetch("/api/agents");
  const data = await res.json();
  return (data.agents ?? []).map(
    (a: { id: string; name: string; status: string; type?: string }) => ({
      id: a.id, name: a.name, status: a.status, type: a.type,
    }),
  );
}

export async function fetchHistory(agentId: string): Promise<ChatMessage[]> {
  const res = await fetch(`/api/agents/${agentId}/chat`);
  const data = await res.json();
  return data.history ?? [];
}

export async function sendChatMessage(
  agentId: string,
  message: string,
  signal: AbortSignal,
): Promise<{ ok: boolean; status: number; reply?: string; document?: ChatDocument; error?: string }> {
  const res = await fetch(`/api/agents/${agentId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
    signal,
  });
  const data: { reply?: string; document?: ChatDocument; error?: string } =
    await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, ...data };
}

export async function clearChatHistory(agentId: string): Promise<void> {
  await fetch(`/api/agents/${agentId}/chat`, { method: "DELETE" });
}
