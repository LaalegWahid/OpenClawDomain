"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { signIn } from "../actions/auth.actions";
import { validatePasswordLength } from "../lib/auth.lib";

const mono  = "var(--mono), 'JetBrains Mono', monospace";
const serif = "var(--serif), 'Cormorant Garamond', Georgia, serif";

function Field({
  id, label, type, value, onChange, placeholder, autoComplete,
}: {
  id: string; label: string; type: string;
  value: string; onChange: (v: string) => void;
  placeholder: string; autoComplete?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label htmlFor={id} style={{ fontFamily: mono, fontSize: "11px", fontWeight: 500, letterSpacing: "0.08em", color: "var(--foreground-2)", textTransform: "uppercase" }}>
        {label}
      </label>
      <input
        id={id} type={type} autoComplete={autoComplete} required
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          background: "var(--surface-2)",
          border: `1px solid ${focused ? "#FF4D00" : "var(--border)"}`,
          borderRadius: "8px", padding: "11px 14px",
          fontFamily: mono, fontSize: "13px", color: "var(--foreground)",
          outline: "none", width: "100%", transition: "border-color 0.15s",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const lengthError = validatePasswordLength(password);
    if (lengthError) { setError(lengthError); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Could not create account. Please try again."); setLoading(false); return; }
      await signIn(email, password, "/subscribe");
    } catch {
      setError("Could not create account. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "2.5rem 2.25rem", boxShadow: "0 4px 24px rgba(42,31,25,0.07)" }}>
      {/* Logo */}
      <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "10px", textDecoration: "none", marginBottom: "2rem" }}>
        <svg width="30" height="30" viewBox="0 0 56 56" fill="none">
          <rect width="56" height="56" rx="13" fill="#FF4D00"/>
          <line x1="15" y1="40" x2="23" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square"/>
          <line x1="24" y1="40" x2="32" y2="12" stroke="white" strokeWidth="4.5" strokeLinecap="square"/>
          <line x1="33" y1="40" x2="41" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square"/>
        </svg>
        <span style={{ fontFamily: serif, fontSize: "20px", fontWeight: 600, letterSpacing: "-0.01em", color: "var(--foreground)", lineHeight: 1 }}>
          Open<span style={{ color: "#FF4D00" }}>Claw</span>
        </span>
      </Link>

      {/* Heading */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontFamily: serif, fontSize: "clamp(1.6rem, 3vw, 2rem)", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--foreground)", margin: "0 0 6px", lineHeight: 1.1 }}>
          Create your account
        </h1>
        <p style={{ fontFamily: mono, fontSize: "12px", color: "var(--foreground-3)", lineHeight: 1.6, letterSpacing: "0.02em", margin: 0 }}>
          Deploy your first agent in minutes.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {error && (
          <div style={{ background: "rgba(255,77,0,0.06)", border: "1px solid rgba(255,77,0,0.25)", borderRadius: "8px", padding: "10px 14px", fontFamily: mono, fontSize: "12px", color: "#FF4D00" }}>
            {error}
          </div>
        )}
        <Field id="name" label="Full name" type="text" autoComplete="name" value={name} onChange={setName} placeholder="John Doe" />
        <Field id="email" label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} placeholder="you@example.com" />
        <Field id="password" label="Password" type="password" autoComplete="new-password" value={password} onChange={setPassword} placeholder="Min. 8 characters" />
        <button type="submit" disabled={loading} style={{
          marginTop: "4px", background: loading ? "var(--surface-2)" : "#FF4D00",
          color: loading ? "var(--foreground-3)" : "#fff", border: "none", borderRadius: "10px",
          padding: "13px", fontFamily: mono, fontSize: "12px", fontWeight: 600,
          letterSpacing: "0.08em", textTransform: "uppercase",
          cursor: loading ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%",
        }}>
          {loading ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Creating account…</> : "Create account →"}
        </button>
      </form>

      <div style={{ height: "1px", background: "var(--border)", margin: "1.75rem 0" }} />

      <p style={{ textAlign: "center", fontFamily: mono, fontSize: "12px", color: "var(--foreground-3)", margin: 0 }}>
        Already have an account?{" "}
        <Link href="/login" style={{ color: "var(--foreground)", textDecoration: "none", fontWeight: 600 }}>Sign in</Link>
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
