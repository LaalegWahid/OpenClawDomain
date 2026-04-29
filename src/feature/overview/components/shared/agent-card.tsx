import { Bot } from "lucide-react";
import Link from "next/link";
import { ACCENT, getStatusColor, getTypeColor, mono, serif } from "./constants";
import type { AgentRecord } from "./types";

export function AgentCard({ ag }: { ag: AgentRecord }) {
  return (
    <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "16px", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{
          width: 42, height: 42,
          background: ag.profileImage ? "transparent" : "rgba(255,77,0,0.08)",
          border: ag.profileImage ? "none" : "1px solid rgba(255,77,0,0.15)",
          borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, overflow: "hidden",
        }}>
          {ag.profileImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ag.profileImage} alt={ag.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }} />
          ) : (
            <Bot size={18} color={ACCENT} />
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: getStatusColor(ag.status), display: "inline-block" }} />
          <span style={{ fontFamily: mono, fontSize: 10, color: "var(--foreground-3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {ag.status}
          </span>
        </div>
      </div>

      <div>
        <div style={{ fontFamily: serif, fontSize: 17, fontWeight: 600, color: "var(--foreground)", marginBottom: 4 }}>{ag.name}</div>
        <div style={{ fontFamily: mono, fontSize: 11, color: ACCENT, letterSpacing: "0.04em" }}>@{ag.botUsername}</div>
        {ag.type && (
          <span style={{
            display: "inline-block", marginTop: 8, fontSize: 10, fontWeight: 500,
            fontFamily: mono, letterSpacing: "0.06em", textTransform: "uppercase",
            color: getTypeColor(ag.type),
            background: `${getTypeColor(ag.type)}12`,
            border: `1px solid ${getTypeColor(ag.type)}25`,
            borderRadius: 4, padding: "2px 8px",
          }}>
            {ag.type}
          </span>
        )}
        {typeof ag.trialDaysLeft === "number" && (
          <div style={{ marginTop: 8 }}>
            <span style={{
              display: "inline-block", fontSize: 10, fontWeight: 500,
              fontFamily: mono, letterSpacing: "0.06em", textTransform: "uppercase",
              color: ag.trialDaysLeft <= 3 ? "#d92d20" : ACCENT,
              background: ag.trialDaysLeft <= 3 ? "rgba(217,45,32,0.08)" : "rgba(255,77,0,0.08)",
              border: ag.trialDaysLeft <= 3 ? "1px solid rgba(217,45,32,0.25)" : "1px solid rgba(255,77,0,0.2)",
              borderRadius: 4, padding: "2px 8px",
            }}>
              Trial · {ag.trialDaysLeft} {ag.trialDaysLeft === 1 ? "day" : "days"} left
            </span>
          </div>
        )}
      </div>

      <div style={{ height: 1, background: "var(--border)" }} />

      {ag.status === "active" ? (
        <Link href={`/overview/${ag.id}`} style={{ textDecoration: "none" }}>
          <button style={{
            background: "transparent", color: "var(--foreground)",
            border: "1px solid var(--border)", borderRadius: 8,
            padding: 10, fontFamily: mono, fontSize: 12,
            fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase",
            cursor: "pointer", width: "100%",
            transition: "border-color 0.15s, background 0.15s",
          }}>
            View Agent
          </button>
        </Link>
      ) : (
        <button
          disabled
          style={{
            background: "transparent", color: "var(--foreground-3)",
            border: "1px solid var(--border)", borderRadius: 8,
            padding: 10, fontFamily: mono, fontSize: 12,
            fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase",
            cursor: "not-allowed", width: "100%", opacity: 0.6,
            transition: "border-color 0.15s, background 0.15s",
          }}
        >
          {ag.status === "starting" ? "Starting…" : ag.status === "error" ? "Error" : "Unavailable"}
        </button>
      )}
    </div>
  );
}
