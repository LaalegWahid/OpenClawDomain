"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Power,
  RefreshCw,
  Bot,
  Brain,
  Plug,
  Server,
  Activity as ActivityIcon,
  MessageSquare,
  Sliders,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { SimChatPanel } from "./sim-chat-panel";

const BG = "#f8f2ed";
const INK = "#2a1f19";
const MUTED = "#6b5d52";
const CARD = "#fbf6f1";
const BORDER = "rgba(42,31,25,0.12)";
const ACCENT = "#FF4D00";
const ACCENT_GLOW = "0 8px 25px rgba(255,77,0,0.18)";

const pageStyles = `
  @keyframes oc-fade-up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes oc-shimmer-anim { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  .oc-page-section { animation: oc-fade-up 0.5s ease both; }
  .oc-card { transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; }
  .oc-card-hover:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(42,31,25,0.08); }
  .oc-btn-primary { transition: transform 0.18s ease, box-shadow 0.18s ease; }
  .oc-btn-primary:hover { transform: translateY(-1px); box-shadow: ${ACCENT_GLOW}; }
  .oc-shimmer-text {
    background:linear-gradient(90deg,#FF4D00 0%,#FF8C42 40%,#FFB88C 50%,#FF8C42 60%,#FF4D00 100%);
    background-size:200% 100%;
    -webkit-background-clip:text; background-clip:text;
    -webkit-text-fill-color:transparent;
    animation: oc-shimmer-anim 4s ease-in-out infinite;
    font-style: italic;
  }
  .oc-tab-btn { transition: color 0.18s ease, border-color 0.18s ease; }
  .oc-stat:hover { transform: translateY(-2px); border-color: rgba(255,77,0,0.35); }
`;

type Tab = "info" | "playground" | "aiSettings" | "platforms" | "skills" | "mcp" | "activity";

const ROB = {
  id: "rob",
  name: "Rob",
  botUsername: "ClawMananger03_bot",
  type: "trading",
  status: "active",
  profileImage: "/rob.png",
  systemPrompt:
    "You are Rob, a Trading Agent. Speak the language of markets — bid/ask, RR, drawdown, position sizing. Risk-first, education-only, no live market data.",
  apiProvider: "anthropic",
  agentModel: "claude-haiku-4-5-20251001",
  createdAt: "2026-04-20T12:00:00.000Z",
};

const MOCK_MEMORY = { sessionCount: 0, totalMessages: 0, estimatedTokens: 0 };
const MOCK_CHANNELS = [{ id: "c1", platform: "telegram" as const, enabled: true, createdAt: "2026-04-20T12:01:00.000Z" }];
const MOCK_SKILLS = [
  { id: "s1", name: "Risk Calculator", description: "Position sizing helper" },
  { id: "s2", name: "Trade Journal", description: "Logs entries, exits, R-multiples" },
];
const MOCK_MCP: { id: string; serverName: string }[] = [];
const MOCK_ACTIVITIES = [
  { id: "a1", type: "deploy", message: "Trading agent container started", createdAt: "2026-04-28T17:30:00.000Z" },
  { id: "a2", type: "chat", message: "Reviewed BTCUSD setup on the 4H", createdAt: "2026-04-28T17:34:12.000Z" },
  { id: "a3", type: "memory", message: "Logged trade idea: EURUSD short, 1:3 RR", createdAt: "2026-04-28T17:35:48.000Z" },
];

function typeColor(_type?: string) {
  return "#2a1f19";
}

export function SimRobContent() {
  const [activeTab, setActiveTab] = useState<Tab>("playground");

  const stats = [
    { label: "Sessions", value: MOCK_MEMORY.sessionCount, tab: "info" as Tab },
    { label: "Messages", value: MOCK_MEMORY.totalMessages, tab: "info" as Tab },
    {
      label: "Tokens",
      value:
        MOCK_MEMORY.estimatedTokens >= 1000
          ? `${(MOCK_MEMORY.estimatedTokens / 1000).toFixed(1)}k`
          : MOCK_MEMORY.estimatedTokens,
      tab: "info" as Tab,
    },
    { label: "Channels", value: MOCK_CHANNELS.length, tab: "platforms" as Tab },
    { label: "Skills", value: MOCK_SKILLS.length, tab: "skills" as Tab },
    { label: "MCP Servers", value: MOCK_MCP.length, tab: "mcp" as Tab },
  ];

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "info", label: "Info", icon: <Brain size={14} /> },
    { key: "playground", label: "Playground", icon: <Bot size={14} /> },
    { key: "aiSettings", label: "AI Settings", icon: <Sliders size={14} /> },
    { key: "platforms", label: "Platforms", icon: <Plug size={14} /> },
    { key: "skills", label: "Skills", icon: <Brain size={14} /> },
    { key: "mcp", label: "MCP", icon: <Server size={14} /> },
    { key: "activity", label: "Activity", icon: <ActivityIcon size={14} /> },
  ];

  return (
    <>
      <style>{pageStyles}</style>
      <div style={{ background: BG, color: INK, minHeight: "100vh", padding: "0 0 80px", margin: "-100px -2.5rem -3rem" }}>
        {/* Cover band */}
        <div style={{ position: "relative", height: 160 }}>
          <Link
            href="/sim"
            style={{
              position: "absolute", top: 20, left: 24,
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 13, color: MUTED, textDecoration: "none",
              padding: "6px 12px", borderRadius: 999,
              background: "rgba(255,255,255,0.55)", border: `1px solid ${BORDER}`,
            }}
          >
            <ArrowLeft size={14} /> Overview
          </Link>
        </div>

        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 2rem" }}>
          {/* Profile header */}
          <div
            className="oc-page-section"
            style={{ display: "flex", alignItems: "flex-end", gap: 24, marginTop: -64, marginBottom: 28, flexWrap: "wrap" }}
          >
            <div style={{ position: "relative" }}>
              <div
                style={{
                  width: 128, height: 128, borderRadius: "50%",
                  background: "transparent",
                  border: `4px solid ${BG}`,
                  boxShadow: "0 10px 30px rgba(42,31,25,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ROB.profileImage} alt={ROB.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 260, paddingBottom: 4 }}>
              <h1 style={{ fontFamily: "var(--serif)", fontSize: 36, fontWeight: 600, margin: 0, lineHeight: 1.1 }}>
                <span className="oc-shimmer-text">{ROB.name}</span>
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap", color: MUTED, fontSize: 14 }}>
                <span style={{ fontFamily: "var(--mono), monospace" }}>@{ROB.botUsername}</span>
                <span
                  style={{
                    padding: "2px 10px", borderRadius: 999,
                    fontSize: 11, fontWeight: 600,
                    color: typeColor(ROB.type),
                    background: `${typeColor(ROB.type)}14`,
                    border: `1px solid ${typeColor(ROB.type)}33`,
                    textTransform: "capitalize",
                  }}
                >
                  {ROB.type}
                </span>
                <StatusPill status={ROB.status} />
                <span style={{ fontSize: 12, color: MUTED }}>· Created {new Date(ROB.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}>
              <button
                disabled
                title="Disabled in simulation"
                className="oc-btn-primary"
                style={{
                  padding: "10px 18px", borderRadius: 10, border: `1px solid ${BORDER}`,
                  background: CARD, color: INK, fontSize: 13, fontWeight: 600,
                  cursor: "not-allowed", opacity: 0.6,
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}
              >
                <MessageSquare size={14} /> Feedback
              </button>
            </div>

            <div style={{ display: "inline-flex", gap: 8 }}>
              <button
                disabled
                title="Disabled in simulation"
                className="oc-btn-primary"
                style={{
                  padding: "10px 18px", borderRadius: 10, border: `1px solid ${BORDER}`,
                  background: CARD, color: INK, fontSize: 13, fontWeight: 600,
                  cursor: "not-allowed", opacity: 0.6,
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}
              >
                <RefreshCw size={14} /> Restart agent
              </button>
              <button
                disabled
                title="Disabled in simulation"
                className="oc-btn-primary"
                style={{
                  padding: "10px 18px", borderRadius: 10,
                  border: "1px solid rgba(226,61,45,0.35)",
                  background: "rgba(226,61,45,0.08)", color: "#c83426",
                  fontSize: 13, fontWeight: 600,
                  cursor: "not-allowed", opacity: 0.6,
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}
              >
                <Power size={14} /> Delete agent
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div
            className="oc-page-section"
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 28 }}
          >
            {stats.map((s) => (
              <button
                key={s.label}
                onClick={() => setActiveTab(s.tab)}
                className="oc-stat oc-card"
                style={{
                  background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14,
                  padding: "16px 18px", textAlign: "left", cursor: "pointer", color: INK,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {s.label}
                </div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 600, marginTop: 4 }}>
                  {s.value}
                </div>
              </button>
            ))}
          </div>

          {/* Tab bar */}
          <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${BORDER}`, marginBottom: 24, overflowX: "auto" }}>
            {tabs.map((t) => {
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className="oc-tab-btn"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "10px 16px", fontSize: 13, fontWeight: 600,
                    color: active ? ACCENT : MUTED,
                    background: "transparent", border: "none",
                    borderBottom: `2px solid ${active ? ACCENT : "transparent"}`,
                    marginBottom: -1, cursor: "pointer", whiteSpace: "nowrap",
                  }}
                >
                  {t.icon} {t.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          {activeTab === "info" && (
            <div className="oc-page-section" style={{ display: "grid", gap: 20 }}>
              <Card title="Bio" icon={<Brain size={16} />}>
                <p style={{ margin: 0, fontSize: 14, color: INK, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                  {ROB.systemPrompt}
                </p>
              </Card>
              <Card
                title="Context Memory"
                icon={<Brain size={16} />}
                action={
                  <button
                    disabled
                    title="Disabled in simulation"
                    style={{
                      background: "transparent", border: "none", color: "#c83426",
                      fontSize: 12, fontWeight: 600, cursor: "not-allowed", opacity: 0.6,
                      display: "inline-flex", alignItems: "center", gap: 4,
                    }}
                  >
                    <Trash2 size={14} /> Clear
                  </button>
                }
              >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                  <Stat small label="Sessions" value={MOCK_MEMORY.sessionCount} />
                  <Stat small label="Messages" value={MOCK_MEMORY.totalMessages} />
                  <Stat small label="Est. Tokens" value={`${(MOCK_MEMORY.estimatedTokens / 1000).toFixed(1)}k`} />
                </div>
              </Card>
            </div>
          )}

          {activeTab === "playground" && (
            <div
              className="oc-page-section"
              style={{ height: 620, borderRadius: 16, border: "1px solid transparent", overflow: "hidden", display: "flex", flexDirection: "column" }}
            >
              <SimChatPanel />
            </div>
          )}

          {activeTab === "aiSettings" && (
            <div className="oc-page-section" style={{ display: "grid", gap: 20 }}>
              <Card title="AI Provider & Model" icon={<Sliders size={16} />}>
                <div style={{ display: "grid", gap: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Field label="Provider" value={ROB.apiProvider} />
                    <Field label="Model" value={ROB.agentModel} />
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: MUTED }}>
                    AI settings are read-only in simulation mode.
                  </p>
                </div>
              </Card>
            </div>
          )}

          {activeTab === "platforms" && (
            <div className="oc-page-section" style={{ display: "grid", gap: 12 }}>
              {(["telegram", "discord", "whatsapp"] as const).map((platform) => {
                const isConnected = platform === "telegram";
                return (
                  <div
                    key={platform}
                    className="oc-card"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "14px 18px", background: CARD, border: `1px solid ${BORDER}`,
                      borderRadius: 12, cursor: isConnected ? "default" : "not-allowed",
                      opacity: isConnected ? 1 : 0.6,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <PlatformIcon platform={platform} />
                      <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, textTransform: "capitalize" }}>
                          {platform === "whatsapp" ? "WhatsApp" : platform}
                        </p>
                        <p style={{ margin: 0, fontSize: 12, color: MUTED }}>
                          {isConnected ? `@${ROB.botUsername}` : "Not connected · disabled in simulation"}
                        </p>
                      </div>
                    </div>
                    {isConnected && (
                      <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 999, color: "#2f9e5e", background: "rgba(47,158,94,0.12)" }}>
                        Active
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "skills" && (
            <div className="oc-page-section" style={{ display: "grid", gap: 12 }}>
              {MOCK_SKILLS.map((s) => (
                <div
                  key={s.id}
                  className="oc-card"
                  style={{
                    padding: "14px 18px", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{s.name}</p>
                    <p style={{ margin: 0, fontSize: 12, color: MUTED }}>{s.description}</p>
                  </div>
                  <span style={{ fontSize: 11, color: MUTED, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Attached
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "mcp" && (
            <div className="oc-page-section" style={{ padding: "40px 20px", textAlign: "center", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14 }}>
              <Server size={28} color={MUTED} style={{ margin: "0 auto 10px" }} />
              <p style={{ margin: 0, fontSize: 13, color: MUTED }}>No MCP servers connected.</p>
            </div>
          )}

          {activeTab === "activity" && (
            <div className="oc-page-section" style={{ display: "grid", gap: 12 }}>
              {MOCK_ACTIVITIES.map((a) => (
                <div
                  key={a.id}
                  className="oc-card"
                  style={{ padding: "14px 18px", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, display: "flex", gap: 12, alignItems: "flex-start" }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,77,0,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Bot size={14} color={ACCENT} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, color: INK }}>{a.message}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: MUTED, fontFamily: "var(--mono), monospace" }}>
                      {new Date(a.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Inline reproductions of the real helpers (kept private to the sim) ────────

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    active: { bg: "rgba(42,31,25,0.08)", color: "#2a1f19" },
    error: { bg: "rgba(42,31,25,0.08)", color: "#2a1f19" },
    starting: { bg: "rgba(42,31,25,0.08)", color: "#6b5a4d" },
  };
  const style = map[status] ?? { bg: "rgba(42,31,25,0.08)", color: MUTED };
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "2px 10px", borderRadius: 999,
        fontSize: 11, fontWeight: 600,
        background: style.bg, color: style.color,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: style.color }} />
      {status}
    </span>
  );
}

function Card({
  title, icon, action, children,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="oc-card" style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: INK }}>
          {icon}
          <h3 style={{ fontFamily: "var(--serif)", fontSize: 16, margin: 0, fontWeight: 600 }}>
            <em>{title}</em>
          </h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value, small }: { label: string; value: React.ReactNode; small?: boolean }) {
  return (
    <div style={{ background: "rgba(42,31,25,0.04)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--serif)", fontSize: small ? 22 : 28, fontWeight: 600, marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: "0.05em", textTransform: "uppercase" }}>
        {label}
      </label>
      <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#fff", color: INK, fontSize: 13 }}>
        {value}
      </div>
    </div>
  );
}

function PlatformIcon({ platform }: { platform: "telegram" | "discord" | "whatsapp" }) {
  if (platform === "discord") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" fill="#5865F2"/>
      </svg>
    );
  }
  if (platform === "whatsapp") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="#25D366"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.128.558 4.121 1.532 5.85L.057 23.63a.5.5 0 0 0 .612.612l5.782-1.475A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.89 0-3.659-.522-5.168-1.431l-.37-.22-3.833.978.995-3.634-.24-.38A9.953 9.953 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" fill="#25D366"/>
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.19 13.9l-2.965-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.963.659z" fill="#2AABEE"/>
    </svg>
  );
}
