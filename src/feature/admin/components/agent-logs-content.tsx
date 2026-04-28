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
import { fetchAgentLogs } from "../actions/admin.actions";
import {
  BG,
  BORDER,
  CARD,
  DANGER,
  INK,
  LOG_BG,
  LOG_FG,
  LOG_MUTED,
  LogsStyles,
  MUTED,
  MetaField,
  ToolbarBtn,
  agentStatusColor,
  formatLogTs,
  logLineColor,
  type AgentInfo,
  type InitialLogs,
  type LogLine,
} from "./shared";

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
      const data = await fetchAgentLogs(agent.id);
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

  const statusColor = agentStatusColor(agent.status);

  return (
    <>
      <LogsStyles />
      <div style={{ display: "flex", flexDirection: "column", gap: 20, color: INK, background: BG }}>
        <div className="oc-logs-fade">
          <Link
            href="/admin"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 12, color: MUTED, textDecoration: "none", marginBottom: 10,
            }}
          >
            <ArrowLeft size={13} /> Back to Admin
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{
              fontFamily: "var(--serif)", fontSize: 26, fontWeight: 600,
              margin: 0, letterSpacing: "-0.02em",
            }}>
              <em>Logs</em> · {agent.name}
            </h1>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: statusColor }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor, display: "inline-block" }} />
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
            background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14,
            display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
            gap: 12, fontSize: 12,
          }}
        >
          <MetaField label="Container (Task ARN)" value={agent.containerId ?? "—"} mono />
          <MetaField label="Log Group" value={logGroup || "—"} mono />
          <MetaField label="Log Stream" value={logStream || "—"} mono />
        </div>

        <div
          className="oc-logs-fade"
          style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}
        >
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 14px", borderBottom: `1px solid ${BORDER}`,
            gap: 10, flexWrap: "wrap",
          }}>
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
                <RefreshCw size={13} style={{ animation: loading ? "oc-spin 0.8s linear infinite" : undefined }} />
                Refresh
              </ToolbarBtn>
            </div>
          </div>

          {error && (
            <div style={{
              margin: "10px 14px 0", fontSize: 12, color: DANGER,
              background: "rgba(200,52,38,0.08)", border: "1px solid rgba(200,52,38,0.25)",
              borderRadius: 8, padding: "8px 12px",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div
            ref={viewportRef}
            onScroll={onScroll}
            style={{
              background: LOG_BG, color: LOG_FG,
              fontFamily: "var(--mono), ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 12, lineHeight: 1.55,
              padding: 0, margin: 14, borderRadius: 10,
              overflow: "auto", maxHeight: 620, minHeight: 320,
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
                      display: "grid", gridTemplateColumns: "170px 1fr",
                      gap: 12, padding: "2px 14px",
                      whiteSpace: "pre-wrap", wordBreak: "break-word",
                      borderBottom: "1px solid rgba(255,255,255,0.03)",
                    }}
                  >
                    <span style={{ color: LOG_MUTED, whiteSpace: "nowrap" }}>
                      {formatLogTs(l.timestamp)}
                    </span>
                    <span style={{ color: logLineColor(l.message) }}>{l.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
