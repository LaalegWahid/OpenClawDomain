import { StopCircle } from "lucide-react";
import { mono } from "./constants";
import { formatDuration, formatTokens } from "./format";
import { SourceBadge } from "./source-badge";
import { StatusBadge } from "./status-badge";
import type { LogEntry } from "./types";

const GRID_COLS = "1fr 100px 90px 80px 90px 80px 70px";

type Props = {
  log: LogEntry;
  expanded: boolean;
  aborting: boolean;
  onToggle: () => void;
  onAbort: () => void;
};

export function LogRow({ log, expanded, aborting, onToggle, onAbort }: Props) {
  return (
    <div>
      <div
        onClick={onToggle}
        style={{
          display: "grid",
          gridTemplateColumns: GRID_COLS,
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
        <div style={{ overflow: "hidden" }}>
          <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 600, color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {log.agentName}
          </div>
          <div style={{ fontFamily: mono, fontSize: 11, color: "var(--foreground-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>
            {log.userPrompt}
          </div>
        </div>

        <div><SourceBadge source={log.source} /></div>
        <div><StatusBadge status={log.status} /></div>

        <div style={{ fontFamily: mono, fontSize: 12, color: "var(--foreground-2)" }}>
          {log.inputTokens != null ? formatTokens(log.inputTokens) : "-"}
        </div>
        <div style={{ fontFamily: mono, fontSize: 12, color: "var(--foreground-2)" }}>
          {log.outputTokens != null ? formatTokens(log.outputTokens) : "-"}
        </div>
        <div style={{ fontFamily: mono, fontSize: 12, color: "var(--foreground-2)" }}>
          {formatDuration(log.durationMs)}
        </div>

        <div>
          {log.status === "running" && (
            <button
              onClick={(e) => { e.stopPropagation(); onAbort(); }}
              disabled={aborting}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "4px 10px", border: "1px solid rgba(244,67,54,0.3)", borderRadius: 6,
                background: "rgba(244,67,54,0.06)", cursor: aborting ? "not-allowed" : "pointer",
                fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase",
                color: "#F44336", transition: "all 0.15s",
              }}
            >
              <StopCircle size={11} />
              {aborting ? "..." : "Abort"}
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "16px 20px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <DetailPanel title="User Prompt" body={log.userPrompt} />
            <DetailPanel
              title="Response"
              body={log.assistantResponse ?? (log.status === "running" ? "Processing..." : "No response")}
            />
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
  );
}

function DetailPanel({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--foreground-3)", marginBottom: 6 }}>
        {title}
      </div>
      <div style={{
        fontFamily: mono, fontSize: 12, color: "var(--foreground)", lineHeight: 1.6,
        background: "#fff", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 14px",
        maxHeight: 200, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word",
      }}>
        {body}
      </div>
    </div>
  );
}

export const LOG_GRID_COLUMNS = GRID_COLS;
