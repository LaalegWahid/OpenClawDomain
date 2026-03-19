"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Check } from "lucide-react";

const FEATURES = [
  "Unlimited AI agent deployments",
  "Real-time Telegram bot management",
  "Priority support & updates",
  "Full API access with rate limiting",
];

export function SubscribeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const canceled = searchParams.get("canceled");

  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);

  const pollSubscription = useCallback(async () => {
    setPolling(true);
    let attempts = 0;
    const maxAttempts = 20;

    const poll = async () => {
      try {
        const res = await fetch("/api/stripe/subscription");
        const data = await res.json();
        if (data.status === "active") {
          router.push("/overview");
          return;
        }
      } catch { /* retry */ }

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 1500);
      } else {
        setPolling(false);
      }
    };

    poll();
  }, [router]);

  useEffect(() => {
    if (sessionId) {
      pollSubscription();
    }
  }, [sessionId, pollSubscription]);

  async function handleSubscribe() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoading(false);
    }
  }

  if (polling) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#0A0A0A",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{ textAlign: "center", color: "#F0EEE8" }}>
          <Loader2
            size={32}
            style={{ animation: "spin 1s linear infinite", margin: "0 auto 16px" }}
          />
          <p style={{ fontSize: "16px", fontWeight: 500 }}>
            Confirming your subscription…
          </p>
          <p style={{ fontSize: "13px", color: "#555555", marginTop: "8px" }}>
            This usually takes a few seconds.
          </p>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0A0A0A",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
    }}>
      <div style={{
        maxWidth: "420px",
        width: "100%",
        background: "#111111",
        border: "0.5px solid #1E1E1E",
        borderRadius: "16px",
        padding: "2.25rem 2rem",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "2rem" }}>
          <svg width="32" height="32" viewBox="0 0 56 56" fill="none">
            <rect width="56" height="56" rx="13" fill="#FF4D00" />
            <line x1="15" y1="40" x2="23" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square" />
            <line x1="24" y1="40" x2="32" y2="12" stroke="white" strokeWidth="4.5" strokeLinecap="square" />
            <line x1="33" y1="40" x2="41" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square" />
          </svg>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 500, letterSpacing: "-0.025em", lineHeight: 1, color: "#F0EEE8" }}>
              Open<span style={{ color: "#FF4D00" }}>Claw</span>
            </div>
            <div style={{ fontSize: "8px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#444444", marginTop: "3px" }}>
              Pro
            </div>
          </div>
        </div>

        {canceled && (
          <div style={{
            background: "rgba(255,77,0,0.06)",
            border: "0.5px solid rgba(255,77,0,0.3)",
            borderRadius: "8px",
            padding: "10px 14px",
            fontSize: "13px",
            color: "#FF4D00",
            marginBottom: "1.5rem",
          }}>
            Checkout was canceled. You can try again when you&apos;re ready.
          </div>
        )}

        <h1 style={{
          fontSize: "clamp(1.5rem, 3vw, 1.9rem)",
          fontWeight: 500,
          letterSpacing: "-0.03em",
          color: "#F0EEE8",
          marginBottom: "6px",
          lineHeight: 1.1,
        }}>
          Subscribe to get started
        </h1>
        <p style={{ fontSize: "13px", color: "#555555", lineHeight: 1.6, marginBottom: "1.5rem" }}>
          Access all features with a simple monthly plan.
        </p>

        {/* Price */}
        <div style={{
          background: "#0A0A0A",
          border: "0.5px solid #1E1E1E",
          borderRadius: "12px",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "1rem" }}>
            <span style={{ fontSize: "36px", fontWeight: 600, color: "#F0EEE8", letterSpacing: "-0.03em" }}>
              $20
            </span>
            <span style={{ fontSize: "14px", color: "#555555" }}>/month</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {FEATURES.map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Check size={14} style={{ color: "#FF4D00", flexShrink: 0 }} />
                <span style={{ fontSize: "13px", color: "#999999" }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleSubscribe}
          disabled={loading}
          style={{
            width: "100%",
            background: loading ? "#2A2A2A" : "#FF4D00",
            color: loading ? "#555555" : "#FFFFFF",
            border: "none",
            borderRadius: "10px",
            padding: "13px",
            fontSize: "15px",
            fontWeight: 500,
            cursor: loading ? "not-allowed" : "pointer",
            letterSpacing: "-0.01em",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          {loading ? (
            <>
              <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
              Redirecting…
            </>
          ) : (
            "Subscribe →"
          )}
        </button>

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
