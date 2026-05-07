"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Bot, Send, Square } from "lucide-react";
import {
  fetchAgents,
  runPeerTest,
  type PeerAgent,
  type PeerTestResult,
} from "../actions/peer-test.actions";

const ACCENT = "#6366f1";
const mono = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

const TEST_TIMEOUT_MS = 180_000;

export function PeerTestContent() {
  const [agents, setAgents] = useState<PeerAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [question, setQuestion] = useState("");

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PeerTestResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const activeAgents = useMemo(() => agents.filter((a) => a.status === "active"), [agents]);

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
    setResult(null);
    setRunError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);

    try {
      const res = await runPeerTest(fromId, toId, question.trim(), controller.signal);
      if ("error" in res) {
        setRunError(`${res.error} (HTTP ${res.status})`);
      } else {
        setResult(res);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setRunError("Request timed out");
      } else {
        setRunError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      clearTimeout(timeoutId);
      setRunning(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "5rem 0" }}>
        <div
          style={{
            width: 24,
            height: 24,
            border: "2px solid var(--border)",
            borderTopColor: ACCENT,
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
          peer-ask endpoint, and returns the chained reply. Both agents must be active and belong to you.
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
          {running ? (
            <>
              <Square size={12} fill="#fff" />
              Running…
            </>
          ) : (
            <>
              <Send size={14} />
              Run test
            </>
          )}
        </button>
        {fromId === toId && fromId && (
          <span style={{ fontFamily: mono, fontSize: 12, color: "var(--error)" }}>
            From and To must differ.
          </span>
        )}
      </div>

      {runError && (
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
          {runError}
        </div>
      )}

      {result && (
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 12,
            background: "var(--surface)",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: mono, fontSize: 11, color: "var(--foreground-3)" }}>
            <span>{result.from.name}</span>
            <ArrowRight size={12} />
            <span>{result.to.name}</span>
            <span style={{ marginLeft: "auto" }}>
              {result.durationMs} ms · in {result.usage.inputTokens} · out {result.usage.outputTokens}
            </span>
          </div>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontFamily: mono,
              fontSize: 13,
              lineHeight: "20px",
              color: "var(--foreground)",
              margin: 0,
            }}
          >
            {result.reply}
          </pre>
        </div>
      )}

      {fromAgent && toAgent && !result && !runError && !running && (
        <p style={{ fontFamily: mono, fontSize: 11, color: "var(--foreground-3)" }}>
          Will send the wrapper prompt to <strong>{fromAgent.name}</strong> instructing it to call{" "}
          <strong>{toAgent.name}</strong> via the peer-ask tool.
        </p>
      )}
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
