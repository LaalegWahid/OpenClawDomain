"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "../actions/auth.actions";
import { validatePasswordLength } from "../lib/auth.lib";
import {
  AuthCard,
  AuthHeading,
  AuthLogo,
  AuthStyles,
  ErrorBanner,
  Field,
  GoogleButton,
  OrDivider,
  SubmitButton,
  mono,
  useGoogleSignIn,
} from "./shared";

export function RegisterForm() {
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
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create account. Please try again.");
        setLoading(false);
        return;
      }
      await signIn(email, password, "/overview");
    } catch {
      setError("Could not create account. Please try again.");
      setLoading(false);
    }
  }

  return (
    <AuthCard padding="2.5rem 2.75rem">
      <AuthLogo />
      <AuthHeading title="Create your account" subtitle="Deploy your first agent in minutes." />

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {error && <ErrorBanner message={error} />}
        <Field id="name" label="Full name" type="text" autoComplete="name" value={name} onChange={setName} placeholder="John Doe" />
        <Field id="email" label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} placeholder="you@example.com" />
        <Field id="password" label="Password" type="password" autoComplete="new-password" value={password} onChange={setPassword} placeholder="Min. 8 characters" />
        <SubmitButton loading={loading} idleLabel="Create account" loadingLabel="Creating account…" />

        <OrDivider />
        <GoogleButton onClick={handleGoogleLogin} disabled={fetchStatus === "fetching"} />
      </form>

      <div style={{ height: "1px", background: "var(--border)", margin: "1.75rem 0" }} />

      <p style={{ textAlign: "center", fontFamily: mono, fontSize: "12px", color: "var(--foreground-3)", margin: 0 }}>
        Already have an account?{" "}
        <Link href="/login" style={{ color: "var(--foreground)", textDecoration: "none", fontWeight: 600 }}>
          Sign in
        </Link>
      </p>

      <AuthStyles />
    </AuthCard>
  );
}
