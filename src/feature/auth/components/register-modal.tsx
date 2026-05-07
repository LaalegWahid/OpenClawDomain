"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { signIn } from "../actions/auth.actions";
import { validatePasswordLength } from "../lib/auth.lib";
import {
  AuthCard,
  AuthLogo,
  AuthStyles,
  ErrorBanner,
  Field,
  GoogleButton,
  OrDivider,
  SubmitButton,
  mono,
  serif,
  useGoogleSignIn,
} from "./shared";

export function RegisterModal({
  onClose,
  referralCode,
}: {
  onClose: () => void;
  referralCode?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { handleGoogleLogin, fetchStatus } = useGoogleSignIn(setError);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const lengthError = validatePasswordLength(password);
    if (lengthError) {
      setError(lengthError);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, ref: referralCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create account. Please try again.");
        setLoading(false);
        return;
      }
      const callback =
        typeof window !== "undefined" ? window.location.pathname : "/overview";
      const result = await signIn(email, password, callback);
      if (result?.error) {
        setError(result.error.message ?? "Account created. Please sign in.");
        setLoading(false);
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError("Could not create account. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(28,22,18,0.4)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1200,
        padding: "1rem",
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 460, position: "relative", margin: "auto" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--foreground-3)",
            padding: 4,
            zIndex: 1,
          }}
        >
          <X size={18} />
        </button>

        <AuthCard padding="1.5rem 2rem">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginBottom: "2rem" }}>
            <AuthLogo marginBottom="2.5rem" />

            <h1 style={{
              fontFamily: serif, fontSize: "2.25rem", fontWeight: 600,
              color: "var(--foreground)", letterSpacing: "-0.04em",
              margin: "0 0 0.5rem 0", textAlign: "left",
              lineHeight: 1.1,
            }}>
              Get your agent.
            </h1>
            <p style={{
              fontFamily: mono, fontSize: "12px", color: "var(--foreground-3)",
              margin: 0, textAlign: "left", lineHeight: 1.6,
            }}>
              Deploy it in minutes and just be cool.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {error && <ErrorBanner message={error} />}
            <Field id="modal-name" label="Full name" type="text" autoComplete="name" value={name} onChange={setName} placeholder="John Doe" />
            <Field id="modal-email" label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} placeholder="you@example.com" />
            <Field id="modal-password" label="Password" type="password" autoComplete="new-password" value={password} onChange={setPassword} placeholder="Min. 8 characters" />
            <SubmitButton loading={loading} idleLabel="Create account" loadingLabel="Creating account…" />

            <OrDivider label="or" margin="0.75rem 0 0.5rem" />
            <GoogleButton onClick={handleGoogleLogin} disabled={fetchStatus === "fetching"} />
          </form>

          <div style={{ height: "1px", background: "var(--border)", margin: "1rem 0" }} />

          <p style={{ textAlign: "center", fontFamily: mono, fontSize: "12px", color: "var(--foreground-3)", margin: 0 }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--foreground)", textDecoration: "none", fontWeight: 600 }}>
              Sign in
            </Link>
          </p>

          <AuthStyles />
        </AuthCard>
      </div>
    </div>
  );
}
