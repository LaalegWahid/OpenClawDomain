"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  RefreshCw,
  Play,
  Pause,
  AlertCircle,
  Terminal,
  Copy,
  CheckCheck,
} from "lucide-react";

const BG = "#f8f2ed";
const INK = "#2a1f19";
const MUTED = "#6b5d52";
const CARD = "#fbf6f1";
const BORDER = "rgba(42,31,25,0.12)";
const ACCENT = "#FF4D00";

const LOG_BG = "#1a1410";
const LOG_FG = "#e8dfd4";
const LOG_MUTED = "#8a7f72";

const styles = `
  @keyframes oc-fade-up { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  .oc-logs-fade { animation: oc-fade-up 0.4s ease both; }
  .oc-log-row:hover { background: rgba(255,255,255,0.02); }
`;

interface AgentInfo {
  id: string;
  name: string;
  botUsername: string;
  type: string;
  status: string;
  containerId: string | null;
  createdAt: string;
  ownerEmail: string | null;
  ownerName: string | null;
}

interface LogLine {
  timestamp: string;
  message: string;
}

interface InitialLogs {
  lines: LogLine[];
  logGroup: string;
  logStream: string;
  error: string | null;
  nextForwardToken: string | null;
}

export function AgentLogsContent({
  agent,
  initial,
}: {
  agent: AgentInfo;
  initial: InitialLogs;
}) {
  const [lines, setLines] = useState<LogLine[]>(initial.lines);
  const [error, setError] = useState<string | null>(initial.error);
  const [logStream, setLogStream] = useState(initial.logStream);
  const [logGroup, setLogGroup] = useState(initial.logGroup);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [copied, setCopied] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pinnedToBottomRef = useRef(true);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/agents/${agent.id}/logs?limit=500`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      const data = (await res.json()) as InitialLogs;
      setLines(data.lines ?? []);
      setLogStream(data.logStream ?? "");
      setLogGroup(data.logGroup ?? "");
      setError(data.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to refresh logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, agent.id]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || !pinnedToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [lines]);

  function onScroll() {
    const el = viewportRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    pinnedToBottomRef.current = atBottom;
  }

  async function copyAll() {
    const text = lines.map((l) => `${l.timestamp}  ${l.message}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  const statusColor =
    agent.status === "active"
      ? "#4CAF50"
      : agent.status === "starting"
        ? "#d98f2b"
        : agent.status === "error"
          ? "#c83426"
          : MUTED;

  return (
    <>
      <style>{styles}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, color: INK, background: BG }}>
        <div className="oc-logs-fade">
          <Link
            href="/admin"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: MUTED,
              textDecoration: "none",
              marginBottom: 10,
            }}
          >
            <ArrowLeft size={13} /> Back to Admin
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1
              style={{
                fontFamily: "var(--serif)",
                fontSize: 26,
                fontWeight: 600,
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              <em>Logs</em> · {agent.name}
            </h1>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                color: statusColor,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: statusColor,
                  display: "inline-block",
                }}
              />
              {agent.status}
            </span>
          </div>

          <div style={{ marginTop: 6, color: MUTED, fontSize: 13 }}>
            <Bot size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />
            @{agent.botUsername} · {agent.type} ·{" "}
            {agent.ownerEmail ?? agent.ownerName ?? "no owner"}
          </div>
        </div>

        <div
          className="oc-logs-fade"
          style={{
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            padding: 14,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
            gap: 12,
            fontSize: 12,
          }}
        >
          <MetaField label="Container (Task ARN)" value={agent.containerId ?? "—"} mono />
          <MetaField label="Log Group" value={logGroup || "—"} mono />
          <MetaField label="Log Stream" value={logStream || "—"} mono />
        </div>

        <div
          className="oc-logs-fade"
          style={{
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 14px",
              borderBottom: `1px solid ${BORDER}`,
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: INK, fontSize: 14, fontWeight: 600 }}>
              <Terminal size={15} />
              <span style={{ fontFamily: "var(--serif)" }}><em>CloudWatch Stream</em></span>
              <span style={{ color: MUTED, fontSize: 12, fontWeight: 400 }}>· {lines.length} lines</span>
            </div>
            <div style={{ display: "inline-flex", gap: 8 }}>
              <ToolbarBtn onClick={copyAll} title="Copy all lines to clipboard">
                {copied ? <CheckCheck size={13} /> : <Copy size={13} />}
                {copied ? "Copied" : "Copy"}
              </ToolbarBtn>
              <ToolbarBtn
                onClick={() => setAutoRefresh((v) => !v)}
                title={autoRefresh ? "Pause auto-refresh" : "Auto-refresh every 4s"}
                active={autoRefresh}
              >
                {autoRefresh ? <Pause size={13} /> : <Play size={13} />}
                {autoRefresh ? "Live" : "Live"}
              </ToolbarBtn>
              <ToolbarBtn onClick={refresh} disabled={loading} title="Refresh now">
                <RefreshCw
                  size={13}
                  style={{
                    animation: loading ? "oc-spin 0.8s linear infinite" : undefined,
                  }}
                />
                Refresh
              </ToolbarBtn>
            </div>
          </div>

          {error && (
            <div
              style={{
                margin: "10px 14px 0",
                fontSize: 12,
                color: "#c83426",
                background: "rgba(200,52,38,0.08)",
                border: "1px solid rgba(200,52,38,0.25)",
                borderRadius: 8,
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div
            ref={viewportRef}
            onScroll={onScroll}
            style={{
              background: LOG_BG,
              color: LOG_FG,
              fontFamily: "var(--mono), ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 12,
              lineHeight: 1.55,
              padding: 0,
              margin: 14,
              borderRadius: 10,
              overflow: "auto",
              maxHeight: 620,
              minHeight: 320,
            }}
          >
            {lines.length === 0 ? (
              <div style={{ padding: 24, color: LOG_MUTED, textAlign: "center" }}>
                {error ? "Couldn't load logs." : "No log entries yet."}
              </div>
            ) : (
              <div>
                {lines.map((l, i) => (
                  <div
                    key={`${l.timestamp}-${i}`}
                    className="oc-log-row"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "170px 1fr",
                      gap: 12,
                      padding: "2px 14px",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      borderBottom: "1px solid rgba(255,255,255,0.03)",
                    }}
                  >
                    <span style={{ color: LOG_MUTED, whiteSpace: "nowrap" }}>
                      {formatTs(l.timestamp)}
                    </span>
                    <span style={{ color: lineColor(l.message) }}>{l.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes oc-spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

function MetaField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: MUTED,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: mono ? "var(--mono), ui-monospace, monospace" : undefined,
          fontSize: 12,
          color: INK,
          wordBreak: "break-all",
        }}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

function ToolbarBtn({
  onClick,
  children,
  disabled,
  title,
  active,
}: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  title?: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: active ? "rgba(255,77,0,0.12)" : "transparent",
        border: `1px solid ${active ? ACCENT : BORDER}`,
        borderRadius: 8,
        padding: "6px 10px",
        fontSize: 12,
        fontWeight: 600,
        color: active ? ACCENT : INK,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

function formatTs(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${d.toLocaleDateString()} ${hh}:${mm}:${ss}.${ms}`;
}

function lineColor(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("error") || m.includes("fatal") || m.includes("exception")) return "#ff8b75";
  if (m.includes("warn")) return "#ffcb6b";
  if (m.includes("info")) return "#c3e88d";
  return LOG_FG;
}
