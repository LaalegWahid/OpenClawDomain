"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Bot,
  Check,
  CircleAlert,
  CircleDot,
  Inbox,
  MessageSquare,
  Send,
  Square,
} from "lucide-react";
import {
  fetchAgents,
  pollPeerTest,
  startPeerTest,
  type PeerAgent,
  type PeerTestEvent,
  type PeerTestJobView,
} from "../actions/peer-test.actions";

const ACCENT = "#6366f1";
const mono = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

export function PeerTestContent() {
  const [agents, setAgents] = useState<PeerAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [question, setQuestion] = useState("");

  const [job, setJob] = useState<PeerTestJobView | null>(null);
  const [running, setRunning] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const pollAbortRef = useRef<AbortController | null>(null);

  const activeAgents = useMemo(
    () => agents.filter((a) => a.status === "active"),
    [agents],
  );

  useEffect(() => {
    fetchAgents()
      .then((list) => {
        setAgents(list);
        const active = list.filter((a) => a.status === "active");
        if (active.length >= 1) setFromId(active[0].id);
        if (active.length >= 2) setToId(active[1].id);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    return () => pollAbortRef.current?.abort();
  }, []);

  const canRun =
    !running &&
    fromId &&
    toId &&
    fromId !== toId &&
    question.trim().length > 0 &&
    activeAgents.some((a) => a.id === fromId) &&
    activeAgents.some((a) => a.id === toId);

  async function handleRun() {
    if (!canRun) return;
    setRunning(true);
    setJob(null);
    setStartError(null);

    const startRes = await startPeerTest(fromId, toId, question.trim());
    if ("error" in startRes) {
      setStartError(`${startRes.error} (HTTP ${startRes.status})`);
      setRunning(false);
      return;
    }

    setJob({
      id: startRes.jobId,
      status: "pending",
      events: [],
      from: startRes.from,
      to: startRes.to,
    });

    const controller = new AbortController();
    pollAbortRef.current?.abort();
    pollAbortRef.current = controller;

    const startedAt = Date.now();
    while (!controller.signal.aborted) {
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setStartError("Polling timed out after 10 min — check CloudWatch logs");
        break;
      }

      try {
        const res = await pollPeerTest(fromId, startRes.jobId, controller.signal);
        if (controller.signal.aborted) break;
        if ("error" in res) {
          setStartError(`${res.error} (HTTP ${res.status})`);
          break;
        }
        setJob(res);
        if (res.status === "done" || res.status === "error") break;
      } catch (err) {
        if (controller.signal.aborted) break;
        setStartError(err instanceof Error ? err.message : "Polling failed");
        break;
      }
      await sleep(POLL_INTERVAL_MS, controller.signal);
    }
    setRunning(false);
  }

  function handleStop() {
    pollAbortRef.current?.abort();
    setRunning(false);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "5rem 0" }}>
        <Spinner />
      </div>
    );
  }

  if (loadError) {
    return <p style={{ fontFamily: mono, color: "var(--error)" }}>Failed to load agents: {loadError}</p>;
  }

  if (activeAgents.length < 2) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 1rem", maxWidth: 520, margin: "0 auto" }}>
        <Bot size={40} color="var(--foreground-3)" style={{ margin: "0 auto 1rem" }} />
        <p style={{ fontFamily: mono, fontSize: 13, color: "var(--foreground-3)" }}>
          You need at least two <strong>active</strong> agents to test peer communication. You currently
          have {activeAgents.length}.
        </p>
      </div>
    );
  }

  const fromAgent = agents.find((a) => a.id === fromId);
  const toAgent = agents.find((a) => a.id === toId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 880 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Peer Agent Test</h1>
        <p style={{ fontFamily: mono, fontSize: 12, color: "var(--foreground-3)" }}>
          Sends a question to <strong>From</strong>, asks it to consult <strong>To</strong> via the
          peer-ask endpoint, and streams each step as it happens. Both agents must be active.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          gap: 12,
          alignItems: "end",
        }}
      >
        <AgentSelect
          label="From agent"
          value={fromId}
          onChange={setFromId}
          agents={agents}
          disabledId={toId}
        />
        <div style={{ paddingBottom: 10, color: "var(--foreground-3)" }}>
          <ArrowRight size={18} />
        </div>
        <AgentSelect
          label="To agent (peer)"
          value={toId}
          onChange={setToId}
          agents={agents}
          disabledId={fromId}
        />
      </div>

      <div>
        <Label>Question</Label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What should the From agent ask the peer?"
          rows={4}
          style={{
            width: "100%",
            resize: "vertical",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "10px 14px",
            fontFamily: mono,
            fontSize: 13,
            lineHeight: "20px",
            color: "var(--foreground)",
            outline: "none",
            minHeight: 90,
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = ACCENT)}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        />
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {running ? (
          <button
            onClick={handleStop}
            style={{
              background: "var(--surface-2)",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "10px 16px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: mono,
              fontSize: 13,
            }}
          >
            <Square size={12} /> Stop polling
          </button>
        ) : (
          <button
            onClick={handleRun}
            disabled={!canRun}
            style={{
              background: canRun ? ACCENT : "var(--surface-2)",
              color: canRun ? "#fff" : "var(--foreground-3)",
              border: "none",
              borderRadius: 8,
              padding: "10px 16px",
              cursor: canRun ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: mono,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <Send size={14} />
            Run test
          </button>
        )}
        {fromId === toId && fromId && (
          <span style={{ fontFamily: mono, fontSize: 12, color: "var(--error)" }}>
            From and To must differ.
          </span>
        )}
      </div>

      {startError && (
        <div
          style={{
            padding: "10px 14px",
            fontFamily: mono,
            fontSize: 12,
            color: "var(--error)",
            background: "rgba(226,61,45,0.06)",
            border: "1px solid rgba(226,61,45,0.2)",
            borderRadius: 8,
          }}
        >
          {startError}
        </div>
      )}

      {job && (
        <Timeline
          job={job}
          fromName={job.from.name}
          toName={job.to.name}
          isPolling={running}
        />
      )}

      {job?.peerReply && (
        <ResultPanel title={`Peer reply (${job.to.name})`} body={job.peerReply} />
      )}

      {job?.result && (
        <ResultPanel
          title={`Final reply (${job.from.name})`}
          body={job.result.reply}
          meta={`in ${job.result.inputTokens} · out ${job.result.outputTokens}`}
          accent
        />
      )}

      {job?.error && (
        <ResultPanel title="Error" body={job.error} error />
      )}

      {fromAgent && toAgent && !job && !startError && !running && (
        <p style={{ fontFamily: mono, fontSize: 11, color: "var(--foreground-3)" }}>
          Will send the wrapper prompt to <strong>{fromAgent.name}</strong> instructing it to call{" "}
          <strong>{toAgent.name}</strong> via the peer-ask tool.
        </p>
      )}
    </div>
  );
}

function Timeline({
  job,
  fromName,
  toName,
  isPolling,
}: {
  job: PeerTestJobView;
  fromName: string;
  toName: string;
  isPolling: boolean;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 12,
        background: "var(--surface)",
        padding: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
          fontFamily: mono,
          fontSize: 11,
          color: "var(--foreground-3)",
        }}
      >
        <span>{fromName}</span>
        <ArrowRight size={12} />
        <span>{toName}</span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <StatusDot status={job.status} polling={isPolling} />
          <span>{job.status}</span>
        </span>
      </div>
      <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {job.events.map((ev, i) => (
          <EventRow key={i} ev={ev} prevTs={i > 0 ? job.events[i - 1].ts : undefined} />
        ))}
        {isPolling && (job.status === "pending" || job.status === "running") && (
          <li style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: mono, fontSize: 12, color: "var(--foreground-3)" }}>
            <Spinner size={12} />
            <span>Waiting for next event…</span>
          </li>
        )}
      </ol>
    </div>
  );
}

function EventRow({ ev, prevTs }: { ev: PeerTestEvent; prevTs?: number }) {
  const dt = prevTs ? ev.ts - prevTs : 0;
  return (
    <li style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <div style={{ paddingTop: 2 }}>
        <EventIcon kind={ev.kind} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline", fontFamily: mono, fontSize: 12 }}>
          <span style={{ color: "var(--foreground)" }}>{ev.message}</span>
          {prevTs && (
            <span style={{ marginLeft: "auto", color: "var(--foreground-3)", fontSize: 10 }}>+{dt} ms</span>
          )}
        </div>
        {ev.detail && (
          <pre
            style={{
              marginTop: 6,
              padding: "6px 10px",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              fontFamily: mono,
              fontSize: 11,
              color: "var(--foreground-3)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: 200,
              overflow: "auto",
              margin: 0,
            }}
          >
            {ev.detail}
          </pre>
        )}
      </div>
    </li>
  );
}

function EventIcon({ kind }: { kind: PeerTestEvent["kind"] }) {
  switch (kind) {
    case "queued":
      return <Inbox size={14} color="var(--foreground-3)" />;
    case "sending":
      return <Send size={14} color={ACCENT} />;
    case "peer_received":
      return <Inbox size={14} color={ACCENT} />;
    case "peer_replied":
      return <MessageSquare size={14} color={ACCENT} />;
    case "from_replied":
      return <MessageSquare size={14} color={ACCENT} />;
    case "done":
      return <Check size={14} color="#22c55e" />;
    case "error":
      return <CircleAlert size={14} color="var(--error)" />;
    default:
      return <CircleDot size={14} />;
  }
}

function StatusDot({
  status,
  polling,
}: {
  status: PeerTestJobView["status"];
  polling: boolean;
}) {
  const color =
    status === "done" ? "#22c55e" : status === "error" ? "#e23d2d" : ACCENT;
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: color,
        boxShadow: polling && (status === "pending" || status === "running") ? `0 0 0 4px ${color}33` : "none",
        animation:
          polling && (status === "pending" || status === "running")
            ? "pulse 1.4s ease-in-out infinite"
            : "none",
      }}
    >
      <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: .5 } }`}</style>
    </span>
  );
}

function ResultPanel({
  title,
  body,
  meta,
  accent,
  error,
}: {
  title: string;
  body: string;
  meta?: string;
  accent?: boolean;
  error?: boolean;
}) {
  const borderColor = error ? "rgba(226,61,45,0.3)" : accent ? ACCENT : "var(--border)";
  return (
    <div
      style={{
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        background: error ? "rgba(226,61,45,0.04)" : "var(--surface)",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: mono,
          fontSize: 11,
          color: error ? "var(--error)" : "var(--foreground-3)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        <span>{title}</span>
        {meta && <span style={{ marginLeft: "auto" }}>{meta}</span>}
      </div>
      <pre
        style={{
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontFamily: mono,
          fontSize: 13,
          lineHeight: "20px",
          color: error ? "var(--error)" : "var(--foreground)",
          margin: 0,
        }}
      >
        {body}
      </pre>
    </div>
  );
}

function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: `2px solid var(--border)`,
        borderTopColor: ACCENT,
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display: "block",
        fontFamily: mono,
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--foreground-3)",
        marginBottom: 6,
      }}
    >
      {children}
    </label>
  );
}

function AgentSelect({
  label,
  value,
  onChange,
  agents,
  disabledId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  agents: PeerAgent[];
  disabledId?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "9px 12px",
          fontFamily: mono,
          fontSize: 13,
          color: "var(--foreground)",
          outline: "none",
          cursor: "pointer",
        }}
      >
        {agents.map((a) => (
          <option key={a.id} value={a.id} disabled={a.id === disabledId || a.status !== "active"}>
            {a.name} — {a.status}
            {a.type ? ` (${a.type})` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      resolve();
    });
  });
}
