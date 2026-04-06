"use client";

import { useState } from "react";

interface AdminContentProps {
  initialEnabled: boolean;
}

export function AdminContent({ initialEnabled }: AdminContentProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function toggle() {
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/service-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceEnabled: !enabled }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Request failed");
      }
      setEnabled((v) => !v);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "560px" }}>

      {/* Card */}
      <div style={{
        background: "#111111",
        border: "0.5px solid #1E1E1E",
        borderRadius: "16px",
        padding: "1.75rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
      }}>
        {/* Header */}
        <div>
          <div style={{ fontSize: "15px", fontWeight: 500, color: "#F0EEE8", marginBottom: "4px" }}>
            Service Control
          </div>
          <div style={{ fontSize: "13px", color: "#555555", lineHeight: 1.6 }}>
            Block or enable the AI service for all testers. When blocked, incoming Telegram messages
            are dropped before reaching the model — no tokens are consumed.
          </div>
        </div>

        <div style={{ height: "0.5px", background: "#1E1E1E" }} />

        {/* Status row */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Indicator dot */}
            <span style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              flexShrink: 0,
              background: enabled ? "#4CAF50" : "#FF4D00",
              boxShadow: enabled
                ? "0 0 0 3px rgba(76,175,80,0.18)"
                : "0 0 0 3px rgba(255,77,0,0.18)",
            }} />
            <div>
              <div style={{ fontSize: "13px", fontWeight: 500, color: "#F0EEE8" }}>
                {enabled ? "Service Active" : "Service Blocked"}
              </div>
              <div style={{ fontSize: "12px", color: "#555555", marginTop: "2px" }}>
                {enabled
                  ? "Testers can send messages and the AI will respond."
                  : "All incoming messages are dropped. No tokens are consumed."}
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: "0.5px", background: "#1E1E1E" }} />

        {/* Action row */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={toggle}
            disabled={loading}
            style={{
              background: enabled ? "#1a1a1a" : "#FF4D00",
              color: enabled ? "#FF4D00" : "#fff",
              border: enabled ? "0.5px solid #FF4D00" : "none",
              borderRadius: "8px",
              padding: "10px 20px",
              fontSize: "13px",
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              letterSpacing: "-0.01em",
              opacity: loading ? 0.6 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {loading ? "Saving…" : enabled ? "Block Service" : "Enable Service"}
          </button>

          {saved && (
            <span style={{ fontSize: "12px", color: "#4CAF50" }}>Saved</span>
          )}
          {error && (
            <span style={{ fontSize: "12px", color: "#ef4444" }}>{error}</span>
          )}
        </div>
      </div>

      {/* Info card */}
      <div style={{
        background: "#111111",
        border: "0.5px solid #1E1E1E",
        borderRadius: "16px",
        padding: "1.25rem 1.75rem",
      }}>
        <div style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.02em", color: "#555555", textTransform: "uppercase", marginBottom: "8px" }}>
          How it works
        </div>
        <p style={{ fontSize: "13px", color: "#555555", margin: 0, lineHeight: 1.7 }}>
          The Telegram webhook checks this flag on every incoming message. When blocked it returns{" "}
          <code style={{ fontFamily: "monospace", fontSize: "12px", color: "#888", background: "#0A0A0A", padding: "1px 5px", borderRadius: "4px", border: "0.5px solid #1E1E1E" }}>
            200 ok
          </code>{" "}
          to Telegram without forwarding to the AI container — ECS stays running, token consumption stops completely.
        </p>
      </div>

    </div>
  );
}
