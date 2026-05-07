import { randomUUID } from "node:crypto";

/**
 * In-memory registry for peer-test jobs.
 *
 * The browser POSTs to start a job, gets a jobId back, then polls for status.
 * The /api/internal/agents/[id]/ask endpoint also writes into the registry so
 * the browser can see when the peer was reached and replied.
 *
 * Caveat: this is in-memory per Next.js process. With a single ECS task it's
 * fine. With horizontal scaling, peer-test events would only show up if the
 * /ask call happens to land on the same instance that started the job. Move
 * to Redis or Postgres NOTIFY if scaling beyond one instance becomes a goal.
 */

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

export interface PeerTestJob {
  id: string;
  userId: string;
  fromAgentId: string;
  toAgentId: string;
  fromName: string;
  toName: string;
  status: PeerTestStatus;
  events: PeerTestEvent[];
  result?: { reply: string; inputTokens: number; outputTokens: number };
  peerReply?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

const JOB_TTL_MS = 10 * 60 * 1000;
const PAIR_TTL_MS = 5 * 60 * 1000;

const jobs = new Map<string, PeerTestJob>();
const activePair = new Map<string, string>();

function pairKey(fromAgentId: string, toAgentId: string): string {
  return `${fromAgentId}:${toAgentId}`;
}

function gc() {
  const now = Date.now();
  for (const [id, job] of jobs.entries()) {
    if (now - job.updatedAt > JOB_TTL_MS) jobs.delete(id);
  }
  for (const [pair, id] of activePair.entries()) {
    const j = jobs.get(id);
    if (!j) {
      activePair.delete(pair);
      continue;
    }
    if (j.status === "done" || j.status === "error") {
      activePair.delete(pair);
      continue;
    }
    if (now - j.updatedAt > PAIR_TTL_MS) activePair.delete(pair);
  }
}

export function createJob(input: {
  userId: string;
  fromAgentId: string;
  toAgentId: string;
  fromName: string;
  toName: string;
}): PeerTestJob {
  gc();
  const id = randomUUID();
  const now = Date.now();
  const job: PeerTestJob = {
    id,
    userId: input.userId,
    fromAgentId: input.fromAgentId,
    toAgentId: input.toAgentId,
    fromName: input.fromName,
    toName: input.toName,
    status: "pending",
    events: [
      {
        ts: now,
        kind: "queued",
        message: `Job queued — ${input.fromName} → ${input.toName}`,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
  jobs.set(id, job);
  activePair.set(pairKey(input.fromAgentId, input.toAgentId), id);
  return job;
}

export function getJob(id: string): PeerTestJob | undefined {
  return jobs.get(id);
}

export function findActivePairJob(
  fromAgentId: string,
  toAgentId: string,
): PeerTestJob | undefined {
  const id = activePair.get(pairKey(fromAgentId, toAgentId));
  if (!id) return undefined;
  const job = jobs.get(id);
  if (!job) return undefined;
  if (job.status === "done" || job.status === "error") return undefined;
  return job;
}

export function appendEvent(
  jobId: string,
  kind: PeerTestEventKind,
  message: string,
  detail?: string,
) {
  const job = jobs.get(jobId);
  if (!job) return;
  const now = Date.now();
  job.events.push({ ts: now, kind, message, detail });
  job.updatedAt = now;
  if (kind === "done") job.status = "done";
  else if (kind === "error") job.status = "error";
  else if (job.status === "pending") job.status = "running";
}

export function setPeerReply(jobId: string, reply: string) {
  const job = jobs.get(jobId);
  if (!job) return;
  job.peerReply = reply;
  job.updatedAt = Date.now();
}

export function setJobResult(
  jobId: string,
  result: { reply: string; inputTokens: number; outputTokens: number },
) {
  const job = jobs.get(jobId);
  if (!job) return;
  job.result = result;
  job.updatedAt = Date.now();
}

export function setJobError(jobId: string, error: string) {
  const job = jobs.get(jobId);
  if (!job) return;
  job.error = error;
  job.status = "error";
  job.events.push({ ts: Date.now(), kind: "error", message: error });
  job.updatedAt = Date.now();
}
