"use client";

import { useState, useEffect, useCallback } from "react";
import { Bot, Loader2, X } from "lucide-react";
import Link from "next/link";

type AgentType = "finance" | "marketing" | "operations";

const AGENT_TYPE_OPTIONS: { value: AgentType; label: string }[] = [
  { value: "finance", label: "Finance" },
  { value: "marketing", label: "Marketing" },
  { value: "operations", label: "Operations" },
];

const DEFAULT_PROMPTS: Record<AgentType, string> = {
  finance: "You help with financial analysis, budgeting, forecasting, and accounting compliance.",
  marketing: "You help with market research, campaign strategy, branding, and content creation.",
  operations: "You help with process optimization, supply chain logistics, and project management.",
};

const TYPE_COLORS: Record<AgentType, string> = {
  finance: "#4CAF50",
  marketing: "#2196F3",
  operations: "#FF9800",
};

interface AgentRecord {
  id: string;
  name: string;
  botUsername: string;
  status: string;
  type?: AgentType;
}

interface OverviewContentProps {
  userName?: string | null;
}

const MAX_BOTS = 3;

export function OverviewContent({ userName }: OverviewContentProps) {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [botToken, setBotToken] = useState("");
  const [botUsername, setBotUsername] = useState("");
  const [botName, setBotName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [agentType, setAgentType] = useState<AgentType>("finance");

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents");
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents ?? []);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const activeAgents = agents.filter((a) => a.status !== "stopped");

  const handleAddBot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botToken, botUsername, name: botName, systemPrompt, type: agentType }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to add bot");
        return;
      }

      // Success — reset form and close modal
      setBotToken("");
      setBotUsername("");
      setBotName("");
      setSystemPrompt("");
      setAgentType("finance");
      setShowModal(false);
      await fetchAgents();
    } catch {
      setError("Failed to add bot. Please try again.");
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
          Manage your Telegram bots and agents. {activeAgents.length} of {MAX_BOTS} bots used.
        </p>
      </div>

      {/* Add Bot button */}
      <div style={{ marginBottom: "14px" }}>
        <button
          onClick={() => setShowModal(true)}
          disabled={activeAgents.length >= MAX_BOTS}
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
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
        gap: "14px",
      }}>
        {agents.length === 0 && (
          <div style={{
            background: "#111111",
            border: "0.5px solid #1E1E1E",
            borderRadius: "16px",
            padding: "2rem",
            textAlign: "center",
            color: "#555555",
            fontSize: "13px",
            gridColumn: "1 / -1",
          }}>
            No bots yet. Click &quot;Add Bot&quot; to connect your first Telegram bot.
          </div>
        )}

        {agents.map((ag) => (
          <div key={ag.id} style={{
            background: "#111111",
            border: "0.5px solid #1E1E1E",
            borderRadius: "16px",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}>
            {/* Icon + status */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{
                width: "40px", height: "40px",
                background: "rgba(255,77,0,0.1)",
                border: "0.5px solid rgba(255,77,0,0.2)",
                borderRadius: "10px",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <Bot size={18} color="#FF4D00" />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{
                  width: "5px", height: "5px", borderRadius: "50%",
                  background: getStatusColor(ag.status),
                  display: "inline-block",
                }} />
                <span style={{ fontSize: "10px", color: "#444444", letterSpacing: "0.05em" }}>
                  {ag.status.charAt(0).toUpperCase() + ag.status.slice(1)}
                </span>
              </div>
            </div>

            {/* Text */}
            <div>
              <div style={{ fontSize: "15px", fontWeight: 500, color: "#F0EEE8", marginBottom: "4px" }}>
                {ag.name}
              </div>
              <div style={{ fontSize: "11px", color: "#FF4D00", letterSpacing: "0.02em" }}>
                @{ag.botUsername}
              </div>
              {ag.type && (
                <span style={{
                  display: "inline-block",
                  marginTop: "6px",
                  fontSize: "10px",
                  fontWeight: 500,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: TYPE_COLORS[ag.type] ?? "#555",
                  background: `${TYPE_COLORS[ag.type] ?? "#555"}15`,
                  border: `0.5px solid ${TYPE_COLORS[ag.type] ?? "#555"}30`,
                  borderRadius: "4px",
                  padding: "2px 8px",
                }}>
                  {ag.type}
                </span>
              )}
            </div>

            {/* Divider */}
            <div style={{ height: "0.5px", background: "#1E1E1E" }} />

            {/* CTA */}
            <Link href={`/overview/${ag.id}`} style={{ textDecoration: "none" }}>
              <button style={{
                background: "transparent",
                color: "#F0EEE8",
                border: "0.5px solid #2A2A2A",
                borderRadius: "8px",
                padding: "10px",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                width: "100%",
                letterSpacing: "-0.01em",
              }}>
                View Agent →
              </button>
            </Link>
          </div>
        ))}
      </div>

      {/* Add Bot Modal */}
      {showModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: "#111111",
              border: "0.5px solid #1E1E1E",
              borderRadius: "16px",
              padding: "2rem",
              width: "100%",
              maxWidth: "460px",
              margin: "1rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "17px", fontWeight: 500, color: "#F0EEE8" }}>Add Bot</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#555" }}>
                <X size={18} />
              </button>
            </div>

            {error && (
              <div style={{
                background: "rgba(255,77,0,0.06)",
                border: "0.5px solid rgba(255,77,0,0.3)",
                borderRadius: "8px",
                padding: "10px 14px",
                fontSize: "13px",
                color: "#FF4D00",
                marginBottom: "14px",
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleAddBot} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <ModalField label="Bot API Token" value={botToken} onChange={setBotToken} placeholder="Paste token from BotFather" />
              <ModalField label="Bot Username" value={botUsername} onChange={setBotUsername} placeholder="e.g. my_cool_bot" />
              <ModalField label="Agent Name" value={botName} onChange={setBotName} placeholder="e.g. Customer Support" />

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.02em", color: "#555555", textTransform: "uppercase" }}>
                  Agent Type
                </label>
                <select
                  value={agentType}
                  onChange={(e) => {
                    const newType = e.target.value as AgentType;
                    setAgentType(newType);
                    setSystemPrompt(DEFAULT_PROMPTS[newType]);
                  }}
                  style={{
                    background: "#0A0A0A",
                    border: "0.5px solid #1E1E1E",
                    borderRadius: "8px",
                    padding: "11px 14px",
                    fontSize: "14px",
                    color: "#F0EEE8",
                    outline: "none",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  {AGENT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.02em", color: "#555555", textTransform: "uppercase" }}>
                  System Prompt / Instructions
                </label>
                <textarea
                  required
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={4}
                  placeholder="Describe how the agent should behave..."
                  style={{
                    background: "#0A0A0A",
                    border: "0.5px solid #1E1E1E",
                    borderRadius: "8px",
                    padding: "11px 14px",
                    fontSize: "14px",
                    color: "#F0EEE8",
                    outline: "none",
                    width: "100%",
                    resize: "none",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  marginTop: "4px",
                  background: submitting ? "#2A2A2A" : "#FF4D00",
                  color: submitting ? "#555555" : "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: submitting ? "wait" : "pointer",
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                    Adding Bot…
                  </>
                ) : (
                  "Add Bot →"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function ModalField({ label, value, onChange, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.02em", color: "#555555", textTransform: "uppercase" }}>
        {label}
      </label>
      <input
        required
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          background: "#0A0A0A",
          border: "0.5px solid #1E1E1E",
          borderRadius: "8px",
          padding: "11px 14px",
          fontSize: "14px",
          color: "#F0EEE8",
          outline: "none",
          width: "100%",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}
