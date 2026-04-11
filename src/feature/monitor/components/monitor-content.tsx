"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, StopCircle, Activity, Zap, Clock, MessageSquare } from "lucide-react";

const mono = "var(--mono), 'JetBrains Mono', monospace";
const serif = "var(--serif), 'Cormorant Garamond', Georgia, serif";

interface LogEntry {
  id: string;
  agentId: string;
  agentName: string;
  source: string;
  status: string;
  userPrompt: string;
  assistantResponse: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  durationMs: number | null;
  createdAt: string;
  completedAt: string | null;
}

interface Stats {
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalRequests: number;
  avgDurationMs: number;
}

const SOURCE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  chat_ui:  { bg: "rgba(33,150,243,0.10)", color: "#2196F3", label: "Chat UI" },
  telegram: { bg: "rgba(42,171,238,0.10)", color: "#2AABEE", label: "Telegram" },
  discord:  { bg: "rgba(88,101,242,0.10)", color: "#5865F2", label: "Discord" },
  whatsapp: { bg: "rgba(37,211,102,0.10)", color: "#25D366", label: "WhatsApp" },
};

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  running:   { bg: "rgba(255,152,0,0.10)", color: "#FF9800" },
  completed: { bg: "rgba(76,175,80,0.10)",  color: "#4CAF50" },
  aborted:   { bg: "rgba(244,67,54,0.10)",  color: "#F44336" },
  error:     { bg: "rgba(244,67,54,0.10)",  color: "#F44336" },
};

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "1.25rem 1.5rem",
      flex: "1 1 200px",
      minWidth: 180,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        {icon}
        <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--foreground-3)" }}>
          {label}
        </span>
      </div>
      <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 600, color: "var(--foreground)", lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: mono, fontSize: 11, color: "var(--foreground-3)", marginTop: 4 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  const s = SOURCE_STYLES[source] ?? { bg: "rgba(0,0,0,0.06)", color: "var(--foreground-2)", label: source };
  return (
    <span style={{
      fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
      background: s.bg, color: s.color,
      padding: "3px 8px", borderRadius: 4,
    }}>
      {s.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { bg: "rgba(0,0,0,0.06)", color: "var(--foreground-2)" };
  return (
    <span style={{
      fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
      background: s.bg, color: s.color,
      padding: "3px 8px", borderRadius: 4,
      display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      {status === "running" && (
        <span style={{
          width: 6, height: 6, borderRadius: "50%", background: s.color,
          animation: "pulse 1.5s infinite",
        }} />
      )}
      {status}
    </span>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function MonitorContent() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<Stats>({ totalTokens: 0, totalInputTokens: 0, totalOutputTokens: 0, totalRequests: 0, avgDurationMs: 0 });
  const [loading, setLoading] = useState(true);
  const [aborting, setAborting] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/monitor");
      if (!res.ok) return;
      const data = await res.json();
      setLogs(data.logs);
      setStats(data.stats);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleAbort = async (logId: string) => {
    setAborting((prev) => new Set(prev).add(logId));
    try {
      await fetch("/api/monitor/abort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId }),
      });
      await fetchData();
    } catch {
      // silently fail
    } finally {
      setAborting((prev) => {
        const next = new Set(prev);
        next.delete(logId);
        return next;
      });
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runningCount = logs.filter((l) => l.status === "running").length;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: serif, fontSize: "clamp(1.6rem, 3vw, 2rem)", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--foreground)", margin: "0 0 4px", lineHeight: 1.1 }}>
            Monitor
          </h1>
          <p style={{ fontFamily: mono, fontSize: 12, color: "var(--foreground-3)", margin: 0, letterSpacing: "0.02em" }}>
            Live activity feed across all agents and channels.
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchData(); }}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", border: "1px solid var(--border)", borderRadius: 8,
            background: "#fff", cursor: "pointer",
            fontFamily: mono, fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase",
            color: "var(--foreground-2)", transition: "border-color 0.15s",
          }}
        >
          <RefreshCw size={13} style={loading ? { animation: "spin 1s linear infinite" } : undefined} />
          Refresh
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 16, marginBottom: "2rem", flexWrap: "wrap" }}>
        <StatCard
          icon={<MessageSquare size={16} color="var(--foreground-3)" />}
          label="Total Requests"
          value={stats.totalRequests.toLocaleString()}
        />
        <StatCard
          icon={<Zap size={16} color="#FF9800" />}
          label="Total Tokens"
          value={formatTokens(stats.totalTokens)}
          sub={`${formatTokens(stats.totalInputTokens)} in / ${formatTokens(stats.totalOutputTokens)} out`}
        />
        <StatCard
          icon={<Clock size={16} color="var(--foreground-3)" />}
          label="Avg Duration"
          value={formatDuration(stats.avgDurationMs)}
        />
        <StatCard
          icon={<Activity size={16} color={runningCount > 0 ? "#FF9800" : "#4CAF50"} />}
          label="Active Now"
          value={String(runningCount)}
        />
      </div>

      {/* Activity log */}
      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {/* Table header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 100px 90px 80px 90px 80px 70px",
          gap: 0,
          padding: "12px 20px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}>
          {["Agent", "Source", "Status", "In Tokens", "Out Tokens", "Duration", ""].map((h) => (
            <span key={h} style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--foreground-3)" }}>
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        {loading && logs.length === 0 ? (
          <div style={{ padding: "3rem 20px", textAlign: "center" }}>
            <RefreshCw size={20} color="var(--foreground-3)" style={{ animation: "spin 1s linear infinite", marginBottom: 8 }} />
            <p style={{ fontFamily: mono, fontSize: 12, color: "var(--foreground-3)", margin: 0 }}>Loading activity...</p>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: "3rem 20px", textAlign: "center" }}>
            <Activity size={28} color="var(--foreground-3)" style={{ marginBottom: 8 }} />
            <p style={{ fontFamily: mono, fontSize: 12, color: "var(--foreground-3)", margin: 0 }}>No activity yet. Send a message to any agent to see it here.</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id}>
              <div
                onClick={() => toggleExpand(log.id)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 100px 90px 80px 90px 80px 70px",
                  gap: 0,
                  padding: "14px 20px",
                  borderBottom: "1px solid var(--border)",
                  cursor: "pointer",
                  transition: "background 0.1s",
                  alignItems: "center",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,77,0,0.02)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {/* Agent + prompt preview */}
                <div style={{ overflow: "hidden" }}>
                  <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 600, color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {log.agentName}
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 11, color: "var(--foreground-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>
                    {log.userPrompt}
                  </div>
                </div>

                {/* Source */}
                <div><SourceBadge source={log.source} /></div>

                {/* Status */}
                <div><StatusBadge status={log.status} /></div>

                {/* In tokens */}
                <div style={{ fontFamily: mono, fontSize: 12, color: "var(--foreground-2)" }}>
                  {log.inputTokens != null ? formatTokens(log.inputTokens) : "-"}
                </div>

                {/* Out tokens */}
                <div style={{ fontFamily: mono, fontSize: 12, color: "var(--foreground-2)" }}>
                  {log.outputTokens != null ? formatTokens(log.outputTokens) : "-"}
                </div>

                {/* Duration */}
                <div style={{ fontFamily: mono, fontSize: 12, color: "var(--foreground-2)" }}>
                  {formatDuration(log.durationMs)}
                </div>

                {/* Abort button */}
                <div>
                  {log.status === "running" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAbort(log.id); }}
                      disabled={aborting.has(log.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        padding: "4px 10px", border: "1px solid rgba(244,67,54,0.3)", borderRadius: 6,
                        background: "rgba(244,67,54,0.06)", cursor: aborting.has(log.id) ? "not-allowed" : "pointer",
                        fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase",
                        color: "#F44336", transition: "all 0.15s",
                      }}
                    >
                      <StopCircle size={11} />
                      {aborting.has(log.id) ? "..." : "Abort"}
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded detail */}
              {expanded.has(log.id) && (
                <div style={{ padding: "16px 20px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--foreground-3)", marginBottom: 6 }}>
                        User Prompt
                      </div>
                      <div style={{
                        fontFamily: mono, fontSize: 12, color: "var(--foreground)", lineHeight: 1.6,
                        background: "#fff", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 14px",
                        maxHeight: 200, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word",
                      }}>
                        {log.userPrompt}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--foreground-3)", marginBottom: 6 }}>
                        Response
                      </div>
                      <div style={{
                        fontFamily: mono, fontSize: 12, color: "var(--foreground)", lineHeight: 1.6,
                        background: "#fff", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 14px",
                        maxHeight: 200, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word",
                      }}>
                        {log.assistantResponse ?? (log.status === "running" ? "Processing..." : "No response")}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 24, marginTop: 12, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: mono, fontSize: 11, color: "var(--foreground-3)" }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                    {log.inputTokens != null && (
                      <span style={{ fontFamily: mono, fontSize: 11, color: "var(--foreground-3)" }}>
                        Tokens: {log.inputTokens.toLocaleString()} in / {(log.outputTokens ?? 0).toLocaleString()} out
                      </span>
                    )}
                    {log.durationMs != null && (
                      <span style={{ fontFamily: mono, fontSize: 11, color: "var(--foreground-3)" }}>
                        Duration: {formatDuration(log.durationMs)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
