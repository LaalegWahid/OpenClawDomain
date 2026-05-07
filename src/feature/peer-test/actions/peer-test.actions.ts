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

export type PeerTestEventKind =
  | "queued"
  | "sending"
  | "peer_received"
  | "peer_replied"
  | "from_replied"
  | "done"
  | "error";

export interface PeerTestEvent {
  ts: number;
  kind: PeerTestEventKind;
  message: string;
  detail?: string;
}

export type PeerTestStatus = "pending" | "running" | "done" | "error";

export interface PeerTestJobView {
  id: string;
  status: PeerTestStatus;
  events: PeerTestEvent[];
  result?: { reply: string; inputTokens: number; outputTokens: number };
  peerReply?: string;
  error?: string;
  from: { id: string; name: string };
  to: { id: string; name: string };
}

export interface StartJobError {
  error: string;
  status: number;
}

export interface StartJobOk {
  jobId: string;
  from: { id: string; name: string };
  to: { id: string; name: string };
}

export async function startPeerTest(
  fromAgentId: string,
  toAgentId: string,
  question: string,
): Promise<StartJobOk | StartJobError> {
  const res = await fetch(`/api/agents/${fromAgentId}/peer-test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ toAgentId, question }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { error: (data.error as string) ?? `HTTP ${res.status}`, status: res.status };
  }
  return data as StartJobOk;
}

export async function pollPeerTest(
  fromAgentId: string,
  jobId: string,
  signal?: AbortSignal,
): Promise<PeerTestJobView | StartJobError> {
  const res = await fetch(`/api/agents/${fromAgentId}/peer-test/${jobId}`, { signal });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { error: (data.error as string) ?? `HTTP ${res.status}`, status: res.status };
  }
  return data as PeerTestJobView;
}
