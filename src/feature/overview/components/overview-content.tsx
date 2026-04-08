"use client";

import { useState, useEffect, useCallback } from "react";
import { Bot, Loader2, X, Sparkles } from "lucide-react";
import Link from "next/link";

interface UserSkill {
  id: string;
  name: string;
  description: string;
}

type Platform = "telegram" | "discord" | "whatsapp";

const skeleton: React.CSSProperties = {
  background: "linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%)",
  backgroundSize: "600px 100%",
  animation: "shimmer 1.4s infinite",
  borderRadius: 6,
};

const TYPE_COLORS: Record<string, string> = {
  finance: "#4CAF50",
  marketing: "#2196F3",
  operations: "#FF9800",
};

const DEFAULT_CUSTOM_COLOR = "#9C27B0";

function getTypeColor(type?: string): string {
  return (type && TYPE_COLORS[type]) || DEFAULT_CUSTOM_COLOR;
}

const PLATFORM_OPTIONS: { value: Platform; label: string; description: string }[] = [
  { value: "telegram", label: "Telegram", description: "Connect via Telegram Bot API" },
  { value: "discord", label: "Discord", description: "Connect via Discord bot" },
  { value: "whatsapp", label: "WhatsApp", description: "Link your WhatsApp account via QR scan" },
];

function PlatformSvg({ platform, size = 24 }: { platform: Platform; size?: number }) {
  if (platform === "telegram") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.19 13.9l-2.965-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.963.659z" fill="#2AABEE"/>
      </svg>
    );
  }
  if (platform === "discord") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" fill="#5865F2"/>
      </svg>
    );
  }
  // WhatsApp
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="#25D366"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.128.558 4.121 1.532 5.85L.057 23.63a.5.5 0 0 0 .612.612l5.782-1.475A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.89 0-3.659-.522-5.168-1.431l-.37-.22-3.833.978.995-3.634-.24-.38A9.953 9.953 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" fill="#25D366"/>
    </svg>
  );
}

interface AgentRecord {
  id: string;
  name: string;
  botUsername: string;
  status: string;
  type?: string;
}

interface OverviewContentProps {
  userName?: string | null;
}

const MAX_BOTS = 3;

const inputStyle: React.CSSProperties = {
  background: "#0A0A0A",
  border: "0.5px solid #1E1E1E",
  borderRadius: "8px",
  padding: "11px 14px",
  fontSize: "14px",
  color: "#F0EEE8",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 500,
  letterSpacing: "0.02em",
  color: "#555555",
  textTransform: "uppercase",
};

export function OverviewContent({ userName }: OverviewContentProps) {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // WhatsApp QR step (shown inside modal after agent creation)
  const [waStep, setWaStep] = useState<"form" | "qr" | "linked">("form");
  const [waAgentId, setWaAgentId] = useState<string | null>(null);
  const [waQrData, setWaQrData] = useState<string | null>(null);
  const [waQrError, setWaQrError] = useState<string | null>(null);

  // Platform
  const [platform, setPlatform] = useState<Platform>("telegram");

  // Telegram fields
  const [botToken, setBotToken] = useState("");
  const [botUsername, setBotUsername] = useState("");

  // Discord fields
  const [discordToken, setDiscordToken] = useState("");

  // WhatsApp — no credential fields needed (QR-based linking after creation)

  // Common fields
  const [botName, setBotName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("You are a helpful specialist agent.");
  const [customType, setCustomType] = useState("");

  // Skills selection
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agents");
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents ?? []);
      }
    } catch {
      setError("We couldn't load your bots right now. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const activeAgents = agents.filter((a) => a.status !== "stopped");

  const resetForm = () => {
    setPlatform("telegram");
    setBotToken(""); setBotUsername("");
    setDiscordToken("");
    setBotName(""); setSystemPrompt("You are a helpful specialist agent."); setCustomType("");
    setSelectedSkillIds([]);
    setError(null);
    setWaStep("form"); setWaAgentId(null); setWaQrData(null); setWaQrError(null);
  };

  const fetchUserSkills = useCallback(async () => {
    try {
      const res = await fetch("/api/skills");
      if (res.ok) {
        const data = await res.json();
        setUserSkills(data.skills ?? []);
      }
    } catch {
      // silent
    }
  }, []);

  const handleAddBot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const effectiveType = customType.trim().toLowerCase();
      const base = { name: botName, systemPrompt, type: effectiveType, skillIds: selectedSkillIds.length > 0 ? selectedSkillIds : undefined };
      const body =
        platform === "telegram"
          ? { platform, botToken, botUsername, ...base }
          : platform === "discord"
          ? { platform, credentials: { botToken: discordToken }, ...base }
          : { platform, ...base };

      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "We couldn't add your bot. Please try again.");
        return;
      }

      await fetchAgents();

      // For WhatsApp: stay in modal and show QR scan step
      if (platform === "whatsapp") {
        const agentId: string = data.agent.id;
        setWaAgentId(agentId);
        setWaStep("qr");

        // Start link session
        const linkRes = await fetch(`/api/agents/${agentId}/whatsapp/link`, { method: "POST" });
        if (!linkRes.ok) {
          const linkErr = await linkRes.json().catch(() => ({}));
          setWaQrError(linkErr.error ?? "Failed to start WhatsApp linking. Try again from the agent page.");
          return;
        }

        // Poll for QR
        const poll = setInterval(async () => {
          const r = await fetch(`/api/agents/${agentId}/whatsapp/link`);
          if (!r.ok) return;
          const d = await r.json();
          if (d.status === "qr_ready" && d.qrData) setWaQrData(d.qrData);
          if (d.status === "linked") {
            clearInterval(poll);
            setWaStep("linked");
            await fetchAgents();
          }
          if (d.status === "failed") {
            clearInterval(poll);
            setWaQrError("Linking failed. You can retry from the agent page.");
          }
        }, 3000);

        // Timeout after 5 min
        setTimeout(() => {
          clearInterval(poll);
          setWaQrError((prev) => prev ?? "Timed out. You can link WhatsApp from the agent page.");
        }, 5 * 60 * 1000);

        return;
      }

      resetForm();
      setShowModal(false);
    } catch {
      setError("Unable to connect. Please check your internet and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  function getStatusColor(status: string) {
    switch (status) {
      case "active": return "#4CAF50";
      case "starting": return "#FFC107";
      case "error": return "#F44336";
      default: return "#555555";
    }
  }

  return (
    <div>
      {/* Heading */}
      <div style={{ marginBottom: "2.5rem" }}>
        <h1 style={{
          fontSize: "clamp(1.4rem, 3vw, 1.9rem)",
          fontWeight: 500,
          letterSpacing: "-0.03em",
          color: "#F0EEE8",
          marginBottom: "6px",
          lineHeight: 1.1,
        }}>
          {userName ? `Welcome back, ${userName}.` : "Welcome back."}
        </h1>
        <p style={{ fontSize: "13px", color: "#555555", lineHeight: 1.6 }}>
          Manage your agents across Telegram, Discord, and WhatsApp. {activeAgents.length} of {MAX_BOTS} bots used.
        </p>
      </div>

      {/* Add Bot button */}
      <div style={{ marginBottom: "14px" }}>
        <button
          onClick={() => { resetForm(); fetchUserSkills(); setShowModal(true); }}
          disabled={activeAgents.length >= MAX_BOTS || loading}
          style={{
            background: activeAgents.length >= MAX_BOTS ? "#2A2A2A" : "#FF4D00",
            color: activeAgents.length >= MAX_BOTS ? "#555555" : "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "10px 20px",
            fontSize: "13px",
            fontWeight: 500,
            cursor: activeAgents.length >= MAX_BOTS ? "not-allowed" : "pointer",
            letterSpacing: "-0.01em",
          }}
        >
          + Add Bot
        </button>
      </div>

      {/* Agent cards */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "14px" }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ background: "#111111", border: "0.5px solid #1E1E1E", borderRadius: "16px", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, ...skeleton }} />
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", ...skeleton }} />
                  <div style={{ width: 44, height: 10, ...skeleton }} />
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ width: "70%", height: 15, ...skeleton }} />
                <div style={{ width: "45%", height: 11, ...skeleton }} />
                <div style={{ width: 52, height: 18, borderRadius: 4, marginTop: 2, ...skeleton }} />
              </div>
              <div style={{ height: "0.5px", background: "#1E1E1E" }} />
              <div style={{ width: "100%", height: 36, borderRadius: 8, ...skeleton }} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "14px" }}>
          {agents.length === 0 && (
            <div style={{
              background: "#111111", border: "0.5px solid #1E1E1E", borderRadius: "16px",
              padding: "2rem", textAlign: "center", color: "#555555", fontSize: "13px", gridColumn: "1 / -1",
            }}>
              No bots yet. Click &quot;Add Bot&quot; to connect your first agent.
            </div>
          )}

          {agents.map((ag) => (
            <div key={ag.id} style={{ background: "#111111", border: "0.5px solid #1E1E1E", borderRadius: "16px", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ width: "40px", height: "40px", background: "rgba(255,77,0,0.1)", border: "0.5px solid rgba(255,77,0,0.2)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Bot size={18} color="#FF4D00" />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: getStatusColor(ag.status), display: "inline-block" }} />
                  <span style={{ fontSize: "10px", color: "#444444", letterSpacing: "0.05em" }}>
                    {ag.status.charAt(0).toUpperCase() + ag.status.slice(1)}
                  </span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: "15px", fontWeight: 500, color: "#F0EEE8", marginBottom: "4px" }}>{ag.name}</div>
                <div style={{ fontSize: "11px", color: "#FF4D00", letterSpacing: "0.02em" }}>@{ag.botUsername}</div>
                {ag.type && (
                  <span style={{
                    display: "inline-block", marginTop: "6px", fontSize: "10px", fontWeight: 500,
                    letterSpacing: "0.05em", textTransform: "uppercase",
                    color: getTypeColor(ag.type),
                    background: `${getTypeColor(ag.type)}15`,
                    border: `0.5px solid ${getTypeColor(ag.type)}30`,
                    borderRadius: "4px", padding: "2px 8px",
                  }}>
                    {ag.type}
                  </span>
                )}
              </div>

              <div style={{ height: "0.5px", background: "#1E1E1E" }} />

              <Link href={`/overview/${ag.id}`} style={{ textDecoration: "none" }}>
                <button style={{ background: "transparent", color: "#F0EEE8", border: "0.5px solid #2A2A2A", borderRadius: "8px", padding: "10px", fontSize: "13px", fontWeight: 500, cursor: "pointer", width: "100%", letterSpacing: "-0.01em" }}>
                  View Agent →
                </button>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Add Bot Modal */}
      {showModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{ background: "#111111", border: "0.5px solid #1E1E1E", borderRadius: "16px", padding: "2rem", width: "100%", maxWidth: "460px", margin: "1rem", maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "17px", fontWeight: 500, color: "#F0EEE8" }}>Add Bot</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#555" }}>
                <X size={18} />
              </button>
            </div>

            {/* Platform selector */}
            <div style={{ marginBottom: "20px" }}>
              <p style={{ ...labelStyle, marginBottom: "10px", display: "block" }}>Choose Platform</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                {PLATFORM_OPTIONS.map((p) => {
                  const ACTIVE_COLORS: Record<Platform, { border: string; bg: string; label: string }> = {
                    telegram: { border: "rgba(42,171,238,0.5)", bg: "rgba(42,171,238,0.08)", label: "#2AABEE" },
                    discord:  { border: "rgba(88,101,242,0.5)", bg: "rgba(88,101,242,0.08)", label: "#5865F2" },
                    whatsapp: { border: "rgba(37,211,102,0.5)", bg: "rgba(37,211,102,0.08)", label: "#25D366" },
                  };
                  const isWhatsAppOption = p.value === "whatsapp";
                  const active = platform === p.value;
                  const ac = ACTIVE_COLORS[p.value];
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPlatform(p.value)}
                      style={{
                        background: active ? ac.bg : "#0A0A0A",
                        border: active ? `0.5px solid ${ac.border}` : "0.5px solid #1E1E1E",
                        borderRadius: "10px",
                        padding: "12px 8px",
                        cursor: "pointer",
                        opacity: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all 0.15s",
                        position: "relative",
                      }}
                    >
                      <PlatformSvg platform={p.value} size={22} />
                      <span style={{ fontSize: "11px", fontWeight: 500, color: active ? ac.label : "#555", letterSpacing: "0.03em" }}>
                        {p.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p style={{ fontSize: "11px", color: "#444", marginTop: "8px" }}>
                {PLATFORM_OPTIONS.find(p => p.value === platform)?.description}
              </p>
            </div>

            {/* ── WhatsApp QR step ──────────────────────────────────────── */}
            {waStep === "qr" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", padding: "8px 0" }}>
                <p style={{ fontSize: "13px", color: "#888", textAlign: "center", lineHeight: 1.6 }}>
                  Open WhatsApp on your phone → <strong style={{ color: "#F0EEE8" }}>Linked Devices</strong> → <strong style={{ color: "#F0EEE8" }}>Link a Device</strong> → scan this QR
                </p>

                {waQrError ? (
                  <div style={{ background: "rgba(255,77,0,0.06)", border: "0.5px solid rgba(255,77,0,0.3)", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#FF4D00", textAlign: "center" }}>
                    {waQrError}
                  </div>
                ) : waQrData ? (
                  <div style={{ background: "#fff", borderRadius: "12px", padding: "10px", lineHeight: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(waQrData)}`}
                      alt="WhatsApp QR code"
                      width={220}
                      height={220}
                    />
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "40px 0" }}>
                    <div style={{ width: "28px", height: "28px", border: "2px solid #25D366", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    <p style={{ fontSize: "12px", color: "#555" }}>Starting WhatsApp pairing session…</p>
                  </div>
                )}

                {waQrData && !waQrError && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#25D366", animation: "pulse 1.5s ease-in-out infinite" }} />
                    <p style={{ fontSize: "12px", color: "#555" }}>Waiting for scan… QR refreshes every ~60s</p>
                  </div>
                )}

                {waQrError && waAgentId && (
                  <a href={`/overview/${waAgentId}`} style={{ fontSize: "13px", color: "#25D366", textDecoration: "none" }}>
                    Go to agent page to link later →
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  style={{ background: "transparent", border: "0.5px solid #2A2A2A", borderRadius: "8px", padding: "9px 20px", fontSize: "13px", color: "#555", cursor: "pointer" }}
                >
                  Skip for now
                </button>
              </div>
            )}

            {/* ── WhatsApp linked step ──────────────────────────────────── */}
            {waStep === "linked" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "16px 0" }}>
                <div style={{ width: "56px", height: "56px", background: "rgba(37,211,102,0.1)", border: "0.5px solid rgba(37,211,102,0.3)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <PlatformSvg platform="whatsapp" size={28} />
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "15px", fontWeight: 500, color: "#F0EEE8", marginBottom: "6px" }}>WhatsApp Linked!</p>
                  <p style={{ fontSize: "13px", color: "#555", lineHeight: 1.6 }}>Your agent is ready to receive and send WhatsApp messages.</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  style={{ background: "#25D366", border: "none", borderRadius: "8px", padding: "10px 28px", fontSize: "13px", fontWeight: 500, color: "#fff", cursor: "pointer" }}
                >
                  Done
                </button>
              </div>
            )}

            {error && waStep === "form" && (
              <div style={{ background: "rgba(255,77,0,0.06)", border: "0.5px solid rgba(255,77,0,0.3)", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#FF4D00", marginBottom: "14px" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleAddBot} style={{ display: waStep !== "form" ? "none" : "flex", flexDirection: "column", gap: "14px" }}>

              {/* Platform-specific credential fields */}
              {platform === "telegram" && (
                <>
                  <ModalField label="Bot API Token" value={botToken} onChange={setBotToken} placeholder="Paste token from BotFather" />
                  <ModalField label="Bot Username" value={botUsername} onChange={setBotUsername} placeholder="e.g. my_cool_bot" />
                </>
              )}

              {platform === "discord" && (
                <ModalField label="Discord Bot Token" value={discordToken} onChange={setDiscordToken} placeholder="Paste token from Discord Developer Portal" />
              )}

              {platform === "whatsapp" && (
                <div style={{ background: "rgba(37,211,102,0.06)", border: "0.5px solid rgba(37,211,102,0.25)", borderRadius: "10px", padding: "14px 16px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <div style={{ flexShrink: 0, marginTop: "1px" }}>
                    <PlatformSvg platform="whatsapp" size={20} />
                  </div>
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: 500, color: "#25D366", marginBottom: "4px" }}>No credentials needed</p>
                    <p style={{ fontSize: "12px", color: "#555", lineHeight: 1.6 }}>
                      Your agent will be created immediately. Then open the agent page and tap <strong style={{ color: "#888" }}>Link WhatsApp</strong> to scan a QR code with your phone — just like WhatsApp Web.
                    </p>
                  </div>
                </div>
              )}

              {/* Common fields */}
              <ModalField label="Agent Name" value={botName} onChange={setBotName} placeholder="e.g. Customer Support" />

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={labelStyle}>Agent Type</label>
                <input
                  type="text"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                  placeholder="e.g. education, cybersecurity, agriculture"
                  style={inputStyle}
                  required
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={labelStyle}>System Prompt / Instructions</label>
                <textarea
                  required
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={4}
                  placeholder="Describe how the agent should behave..."
                  style={{ ...inputStyle, resize: "none", fontFamily: "inherit" }}
                />
              </div>

              {/* Skills Selection */}
              {userSkills.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={labelStyle}>
                    <Sparkles size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
                    Attach Skills ({selectedSkillIds.length} selected)
                  </label>
                  <div style={{ maxHeight: "160px", overflowY: "auto", border: "0.5px solid #1E1E1E", borderRadius: "8px", background: "#0A0A0A" }}>
                    {userSkills.map((s) => {
                      const checked = selectedSkillIds.includes(s.id);
                      return (
                        <label
                          key={s.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "10px 12px",
                            cursor: "pointer",
                            borderBottom: "0.5px solid #1E1E1E",
                            background: checked ? "rgba(255,77,0,0.05)" : "transparent",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setSelectedSkillIds((prev) =>
                                checked ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                              );
                            }}
                            style={{ accentColor: "#FF4D00" }}
                          />
                          <div style={{ overflow: "hidden" }}>
                            <p style={{ fontSize: "12px", fontWeight: 600, color: "#F0EEE8", margin: 0 }}>{s.name}</p>
                            <p style={{ fontSize: "11px", color: "#555", margin: 0, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{s.description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  marginTop: "4px",
                  background: submitting ? "#2A2A2A" : "#FF4D00",
                  color: submitting ? "#555555" : "#fff",
                  border: "none", borderRadius: "8px", padding: "10px",
                  fontSize: "13px", fontWeight: 500,
                  cursor: submitting ? "wait" : "pointer",
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                }}
              >
                {submitting ? (
                  <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Adding Bot…</>
                ) : (
                  `Add ${PLATFORM_OPTIONS.find(p => p.value === platform)?.label} Bot →`
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: -600px 0; } 100% { background-position: 600px 0; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}

function ModalField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.02em", color: "#555555", textTransform: "uppercase" as const }}>
        {label}
      </label>
      <input
        required
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          background: "#0A0A0A", border: "0.5px solid #1E1E1E", borderRadius: "8px",
          padding: "11px 14px", fontSize: "14px", color: "#F0EEE8",
          outline: "none", width: "100%", boxSizing: "border-box" as const,
        }}
      />
    </div>
  );
}
