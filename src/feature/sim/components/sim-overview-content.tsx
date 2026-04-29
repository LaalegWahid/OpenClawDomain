"use client";

import { ACCENT, AgentCard, OverviewStyles, mono, serif, type AgentRecord } from "../../overview/components/shared";

const ROB: AgentRecord = {
  id: "rob",
  name: "Rob",
  botUsername: "ClawMananger03_bot",
  status: "active",
  type: "trading",
  profileImage: "/rob.png",
};

export function SimOverviewContent({ userName }: { userName?: string | null }) {
  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      {/* Heading */}
      <div style={{ marginBottom: "2.5rem", display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{
            fontFamily: serif, fontSize: "clamp(1.8rem, 3vw, 2.4rem)",
            fontWeight: 600, letterSpacing: "-0.02em",
            color: "var(--foreground)", lineHeight: 1.1, margin: "0 0 6px",
          }}>
            {userName ? `Welcome back, ${userName}.` : "Welcome back."}
          </h1>
          <p style={{ fontFamily: mono, fontSize: 12, color: "var(--foreground-3)", lineHeight: 1.6, letterSpacing: "0.02em", margin: 0 }}>
            agents active — Telegram, Discord &amp; WhatsApp
          </p>
        </div>

        <button
          disabled
          title="Disabled in simulation mode"
          style={{
            background: ACCENT, color: "#fff",
            border: "none", borderRadius: 8, padding: "10px 20px",
            fontFamily: mono, fontSize: 12, fontWeight: 500,
            letterSpacing: "0.06em", textTransform: "uppercase",
            cursor: "not-allowed", opacity: 0.6,
          }}
        >
          + New Agent
        </button>
      </div>

      {/* Agent cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        <SimAgentCard ag={ROB} />
      </div>

      <OverviewStyles />
    </div>
  );
}

// Wraps the real AgentCard but rewrites the "View Agent" link target to /sim/rob.
// Since the real AgentCard hardcodes /overview/{id}, we re-render the same visual
// markup against AgentCard to stay pixel-identical, then override the link.
function SimAgentCard({ ag }: { ag: AgentRecord }) {
  return (
    <div style={{ position: "relative" }}>
      <AgentCard ag={ag} />
      {/* Overlay invisible link covering the whole card so clicks route to /sim/rob */}
      <a
        href="/sim/rob"
        aria-label="View Rob"
        style={{
          position: "absolute", inset: 0, display: "block",
          textDecoration: "none", borderRadius: 16,
        }}
      />
    </div>
  );
}
