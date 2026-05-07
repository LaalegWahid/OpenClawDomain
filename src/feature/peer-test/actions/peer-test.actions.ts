export interface PeerAgent {
  id: string;
  name: string;
  status: string;
  type?: string;
}

export async function fetchAgents(): Promise<PeerAgent[]> {
  const res = await fetch("/api/agents");
  if (!res.ok) throw new Error(`Failed to load agents (${res.status})`);
  const data = await res.json();
  return (data.agents ?? []).map(
    (a: { id: string; name: string; status: string; type?: string }) => ({
      id: a.id,
      name: a.name,
      status: a.status,
      type: a.type,
    }),
  );
}

export interface PeerTestResult {
  reply: string;
  usage: { inputTokens: number; outputTokens: number };
  durationMs: number;
  from: { id: string; name: string };
  to: { id: string; name: string };
}

export interface PeerTestError {
  error: string;
  status: number;
}

export async function runPeerTest(
  fromAgentId: string,
  toAgentId: string,
  question: string,
  signal?: AbortSignal,
): Promise<PeerTestResult | PeerTestError> {
  const res = await fetch(`/api/agents/${fromAgentId}/peer-test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ toAgentId, question }),
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { error: (data.error as string) ?? `HTTP ${res.status}`, status: res.status };
  }
  return data as PeerTestResult;
}
