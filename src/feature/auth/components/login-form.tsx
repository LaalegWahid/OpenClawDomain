"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { signIn } from "../actions/auth.actions";

/* ── Field ──────────────────────────────────────────────────── */
function Field({
  id, label, type, value, onChange, placeholder, autoComplete,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (visible ? 'text' : 'password') : type;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label htmlFor={id} style={{
        fontSize: '12px',
        fontWeight: 500,
        letterSpacing: '0.02em',
        color: '#555555',
        textTransform: 'uppercase',
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={inputType}
          autoComplete={autoComplete}
          required
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            background: '#0A0A0A',
            border: `0.5px solid ${focused ? '#FF4D00' : '#1E1E1E'}`,
            borderRadius: '8px',
            padding: isPassword ? '11px 40px 11px 14px' : '11px 14px',
            fontSize: '14px',
            color: '#F0EEE8',
            outline: 'none',
            width: '100%',
            transition: 'border-color 0.15s',
            boxSizing: 'border-box',
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible(v => !v)}
            tabIndex={-1}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: '#555555',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {visible ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── LoginForm ──────────────────────────────────────────────── */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/overview";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    <div style={{
      background: '#111111',
      border: '0.5px solid #1E1E1E',
      borderRadius: '16px',
      padding: '2.25rem 2rem',
    }}>
      {/* Logo */}
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', textDecoration: 'none', marginBottom: '2rem' }}>
        <svg width="32" height="32" viewBox="0 0 56 56" fill="none">
          <rect width="56" height="56" rx="13" fill="#FF4D00"/>
          <line x1="15" y1="40" x2="23" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square"/>
          <line x1="24" y1="40" x2="32" y2="12" stroke="white" strokeWidth="4.5" strokeLinecap="square"/>
          <line x1="33" y1="40" x2="41" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square"/>
        </svg>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1, color: '#F0EEE8' }}>
            Open<span style={{ color: '#FF4D00' }}>Claw</span>
          </div>
          <div style={{ fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#444444', marginTop: '3px' }}>
            Manager
          </div>
        </div>
      </Link>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{
          fontSize: 'clamp(1.5rem, 3vw, 1.9rem)',
          fontWeight: 500,
          letterSpacing: '-0.03em',
          color: '#F0EEE8',
          marginBottom: '6px',
          lineHeight: 1.1,
        }}>
          Welcome back
        </h1>
        <p style={{ fontSize: '13px', color: '#555555', lineHeight: 1.6 }}>
          Sign in to your account to continue.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div style={{
            background: 'rgba(255,77,0,0.06)',
            border: '0.5px solid rgba(255,77,0,0.3)',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '13px',
            color: '#FF4D00',
          }}>
            {error}
          </div>
        )}

        <Field id="email" label="Email" type="email" autoComplete="email"
          value={email} onChange={setEmail} placeholder="you@example.com" />

        <Field id="password" label="Password" type="password" autoComplete="current-password"
          value={password} onChange={setPassword} placeholder="••••••••" />

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: '4px',
            background: loading ? '#2A2A2A' : '#FF4D00',
            color: loading ? '#555555' : '#FFFFFF',
            border: 'none',
            borderRadius: '10px',
            padding: '13px',
            fontSize: '15px',
            fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer',
            letterSpacing: '-0.01em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
          }}
        >
          {loading ? (
            <>
              <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      <div style={{
        height: '0.5px',
        background: 'linear-gradient(90deg, transparent, #1E1E1E 20%, #1E1E1E 80%, transparent)',
        margin: '1.75rem 0',
      }} />

      <p style={{ textAlign: 'center', fontSize: '13px', color: '#555555' }}>
        Don&apos;t have an account?{' '}
        <Link href="/register" style={{ color: '#F0EEE8', textDecoration: 'none', fontWeight: 500 }}>
          Create one
        </Link>
      </p>
    </div>
  );
}
