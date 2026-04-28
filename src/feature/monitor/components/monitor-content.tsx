"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Activity, Zap, Clock, MessageSquare } from "lucide-react";
import { abortLog as abortLogAction, fetchMonitorData } from "../actions/monitor.actions";
import {
  LOG_GRID_COLUMNS,
  LogRow,
  MonitorStyles,
  StatCard,
  formatDuration,
  formatTokens,
  mono,
  serif,
  type LogEntry,
  type Stats,
} from "./shared";

const EMPTY_STATS: Stats = { totalTokens: 0, totalInputTokens: 0, totalOutputTokens: 0, totalRequests: 0, avgDurationMs: 0 };

export function MonitorContent() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [aborting, setAborting] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    try {
      const data = await fetchMonitorData();
      if (!data) return;
      setLogs(data.logs);
      setStats(data.stats);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleAbort = async (logId: string) => {
    setAborting((prev) => new Set(prev).add(logId));
    try {
      await abortLogAction(logId);
      await refresh();
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
          onClick={() => { setLoading(true); refresh(); }}
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
        <div style={{
          display: "grid",
          gridTemplateColumns: LOG_GRID_COLUMNS,
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

        {loading && logs.length === 0 ? (
          <div style={{ padding: "3rem 20px", textAlign: "center" }}>
            <RefreshCw size={20} color="var(--foreground-3)" style={{ animation: "spin 1s linear infinite", marginBottom: 8 }} />
            <p style={{ fontFamily: mono, fontSize: 12, color: "var(--foreground-3)", margin: 0 }}>Loading activity...</p>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: "3rem 20px", textAlign: "center" }}>
            <Activity size={28} color="var(--foreground-3)" style={{ marginBottom: 8 }} />
            <p style={{ fontFamily: mono, fontSize: 12, color: "var(--foreground-3)", margin: 0 }}>
              No activity yet. Send a message to any agent to see it here.
            </p>
          </div>
        ) : (
          logs.map((log) => (
            <LogRow
              key={log.id}
              log={log}
              expanded={expanded.has(log.id)}
              aborting={aborting.has(log.id)}
              onToggle={() => toggleExpand(log.id)}
              onAbort={() => handleAbort(log.id)}
            />
          ))
        )}
      </div>

      <MonitorStyles />
    </div>
  );
}
