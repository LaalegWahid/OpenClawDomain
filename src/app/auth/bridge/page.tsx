"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";

const mono = "'JetBrains Mono', monospace";
const syne = "'Syne', sans-serif";

export default function BridgePage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { signOut } = useClerk();
  const ran = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || ran.current) return;
    ran.current = true;

    (async () => {
      const token = await getToken();
      if (!token) {
        setError("no_clerk_token");
        return;
      }
      const res = await fetch("/api/auth/clerk-bridge", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? `bridge_failed_${res.status}`);
        return;
      }
      await signOut({ redirectUrl: "/overview" });
    })();
  }, [isLoaded, isSignedIn, getToken, signOut]);

  const corners = [
    { top: -1, left: -1, borderWidth: "1.5px 0 0 1.5px" },
    { top: -1, right: -1, borderWidth: "1.5px 1.5px 0 0" },
    { bottom: -1, left: -1, borderWidth: "0 0 1.5px 1.5px" },
    { bottom: -1, right: -1, borderWidth: "0 1.5px 1.5px 0" },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8f2ed",
        fontFamily: mono,
        padding: "2rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Grid texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,77,0,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,77,0,0.06) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
          pointerEvents: "none",
        }}
      />

      {/* Radial glow */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 300,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -60%)",
          background: "radial-gradient(ellipse, rgba(255,77,0,0.1) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Card */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: 380,
          padding: "2.5rem 2rem 2rem",
          background: "#f0e9e2",
          border: "1px solid rgba(42,31,25,0.12)",
          borderTop: "1px solid rgba(42,31,25,0.18)",
        }}
      >
        {/* Corner brackets */}
        {corners.map((style, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 10,
              height: 10,
              borderColor: "#FF4D00",
              borderStyle: "solid",
              opacity: 0.7,
              ...style,
            }}
          />
        ))}

        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "2rem" }}>
          <svg width="32" height="32" viewBox="0 0 56 56" fill="none">
            <rect width="56" height="56" rx="10" fill="#FF4D00" />
            <line x1="15" y1="40" x2="23" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square" />
            <line x1="24" y1="40" x2="32" y2="12" stroke="white" strokeWidth="4.5" strokeLinecap="square" />
            <line x1="33" y1="40" x2="41" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square" />
          </svg>
          <span
            style={{
              fontFamily: syne,
              fontWeight: 800,
              fontSize: 20,
              color: "#1a1209",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            Open<span style={{ color: "#FF4D00" }}>Claw</span>
          </span>
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: "linear-gradient(90deg, #FF4D00, transparent)",
            marginBottom: "1.75rem",
            opacity: 0.35,
          }}
        />

        {error ? (
          /* ── Error state ── */
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.25rem" }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  background: "#cc2200",
                  borderRadius: "50%",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: mono,
                  fontSize: 11,
                  color: "#cc2200",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                }}
              >
                Auth failed
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: "2rem" }}>
              {[
                { icon: "✓", label: "clerk.session.read", meta: "ok", state: "done" },
                { icon: "✗", label: "bridge.token.exchange", meta: "failed", state: "error" },
              ].map(({ icon, label, meta, state }, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontFamily: mono,
                    fontSize: 11,
                    color: state === "done" ? "#8a7060" : "#cc2200",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      width: 12,
                      flexShrink: 0,
                      color: state === "done" ? "#7aaa6a" : "#cc2200",
                    }}
                  >
                    {icon}
                  </span>
                  <span>{label}</span>
                  <span style={{ marginLeft: "auto", fontSize: 10, color: state === "done" ? "#c4b5a8" : "#cc2200" }}>
                    {meta}
                  </span>
                </div>
              ))}
            </div>

            <div
              style={{
                background: "rgba(204,34,0,0.06)",
                border: "1px solid rgba(204,34,0,0.15)",
                padding: "10px 12px",
                marginBottom: "1.5rem",
                fontFamily: mono,
                fontSize: 11,
                color: "#8a4030",
                wordBreak: "break-word",
                lineHeight: 1.6,
              }}
            >
              <span style={{ color: "#cc2200" }}>ERR</span> · {error}
            </div>

            {/* Progress bar — full red */}
            <div style={{ height: 2, background: "rgba(42,31,25,0.1)", overflow: "hidden", marginBottom: "1.25rem" }}>
              <div style={{ height: "100%", background: "#cc2200", width: "100%" }} />
            </div>

            <a
              href="/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#FF4D00",
                color: "#fff",
                padding: "10px 20px",
                fontFamily: mono,
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: "0.04em",
                textDecoration: "none",
                textTransform: "uppercase",
              }}
            >
              ← Back to login
            </a>
          </>
        ) : (
          /* ── Loading state ── */
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.25rem" }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  background: "#FF4D00",
                  borderRadius: "50%",
                  flexShrink: 0,
                  animation: "ocPulse 1.4s ease-in-out infinite",
                }}
              />
              <span
                style={{
                  fontFamily: mono,
                  fontSize: 11,
                  color: "#FF4D00",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                }}
              >
                Finishing sign-in
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: "2rem" }}>
              {[
                { icon: "✓", label: "clerk.session.read", meta: "ok", state: "done" },
                { icon: "›", label: "bridge.token.exchange", meta: "running", state: "active" },
                { icon: "·", label: "account.link", meta: "pending", state: "pending" },
                { icon: "·", label: "redirect.overview", meta: "pending", state: "pending" },
              ].map(({ icon, label, meta, state }, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontFamily: mono,
                    fontSize: 11,
                    color: state === "done" ? "#8a7060" : state === "active" ? "#4a3728" : "#c4b5a8",
                    opacity: 0,
                    animation: "ocFadeIn 0.4s ease forwards",
                    animationDelay: `${0.1 + i * 0.4}s`,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      width: 12,
                      flexShrink: 0,
                      color: state === "done" ? "#7aaa6a" : state === "active" ? "#FF4D00" : "#c4b5a8",
                    }}
                  >
                    {icon}
                  </span>
                  <span>{label}</span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 10,
                      color: state === "active" ? "#FF4D00" : "#c4b5a8",
                    }}
                  >
                    {meta}
                  </span>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div style={{ height: 2, background: "rgba(42,31,25,0.1)", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  background: "#FF4D00",
                  width: "0%",
                  animation: "ocBar 2.8s cubic-bezier(0.4,0,0.2,1) 0.3s forwards",
                }}
              />
            </div>

            {/* Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "1.25rem",
              }}
            >
              <span style={{ fontFamily: mono, fontSize: 10, color: "#c4b5a8", letterSpacing: "0.08em" }}>
                auth.bridge · clerk
              </span>
              <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                {[0, 0.2, 0.4].map((delay, i) => (
                  <div
                    key={i}
                    style={{
                      width: 3,
                      height: 3,
                      background: "#c4b5a8",
                      borderRadius: "50%",
                      animation: "ocDotBlink 1.2s ease-in-out infinite",
                      animationDelay: `${delay}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');

        @keyframes ocPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.7); }
        }
        @keyframes ocFadeIn {
          from { opacity: 0; transform: translateX(-4px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes ocBar {
          0%   { width: 0%; }
          30%  { width: 35%; }
          60%  { width: 68%; }
          85%  { width: 88%; }
          100% { width: 100%; }
        }
        @keyframes ocDotBlink {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </main>
  );
}