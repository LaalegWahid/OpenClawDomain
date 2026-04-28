"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "../actions/auth.actions";
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

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/overview";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { handleGoogleLogin, fetchStatus } = useGoogleSignIn(setError);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password, callbackUrl);
    if (error) {
      setError(error.message ?? "Invalid email or password.");
      setLoading(false);
      return;
    }
    router.push(callbackUrl);
  }

  return (
    <AuthCard>
      <AuthLogo />
      <AuthHeading title="Welcome back" subtitle="Sign in to your account to continue." />

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {error && <ErrorBanner message={error} />}
        <Field id="email" label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} placeholder="you@example.com" />
        <Field id="password" label="Password" type="password" autoComplete="current-password" value={password} onChange={setPassword} placeholder="••••••••" />
        <SubmitButton loading={loading} idleLabel="Sign in" loadingLabel="Signing in…" />
      </form>

      <OrDivider />
      <GoogleButton onClick={handleGoogleLogin} disabled={fetchStatus === "fetching"} />

      <p style={{ textAlign: "center", fontFamily: mono, fontSize: 12, color: "var(--foreground-3)", margin: "1.75rem 0 0" }}>
        Don&apos;t have an account?{" "}
        <Link href="/register" style={{ color: "var(--foreground)", textDecoration: "none", fontWeight: 600 }}>
          Create one
        </Link>
      </p>

      <AuthStyles />
    </AuthCard>
  );
}
