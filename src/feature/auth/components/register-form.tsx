"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { signIn } from "@/feature/auth/actions/auth.actions";
import { validatePasswordLength } from "@/feature/auth/lib/auth.lib";

/* ── Telegram types ────────────────────────────────────────── */
interface TelegramUser {
  id: number;
  first_name: string;
  username?: string;
  auth_date: number;
  hash: string;
}

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramUser) => void;
  }
}

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
      <input
        id={id}
        type={type}
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
          padding: '11px 14px',
          fontSize: '14px',
          color: '#F0EEE8',
          outline: 'none',
          width: '100%',
          transition: 'border-color 0.15s',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

/* ── RegisterForm ───────────────────────────────────────────── */
export function RegisterForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [widgetLoaded, setWidgetLoaded] = useState(false);

  const handleTelegramAuth = useCallback((user: TelegramUser) => {
    setTelegramUser(user);
  }, []);

  useEffect(() => {
    window.onTelegramAuth = handleTelegramAuth;
    return () => { delete window.onTelegramAuth; };
  }, [handleTelegramAuth]);

  useEffect(() => {
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  if (!botUsername) return;
  const container = document.getElementById("telegram-widget");
  if (!container || container.childElementCount > 0) return;

  // Define the callback globally BEFORE the script loads
  window.onTelegramAuth = (user) => {
    console.log("Telegram user:", user);
    // Handle your auth logic here
    // e.g., send user data to your API route
    fetch("/api/telegram-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
  };

  const script = document.createElement("script");
  script.src = "https://telegram.org/js/telegram-widget.js?22";
  script.async = true;
  script.setAttribute("data-telegram-login", botUsername);
  script.setAttribute("data-size", "large");
  script.setAttribute("data-radius", "10");
  script.setAttribute("data-onauth", "onTelegramAuth(user)"); // must match window fn name
  script.setAttribute("data-request-access", "write");
  script.onload = () => setWidgetLoaded(true);
  container.appendChild(script);

  return () => {
    delete window.onTelegramAuth; // cleanup
  };
}, []);

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
        body: JSON.stringify({
          name,
          email,
          password,
          telegramId: telegramUser?.id?.toString(),
          telegramUsername: telegramUser?.username,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not create account. Please try again.");
        setLoading(false);
        return;
      }

      // Sign in after successful registration
      await signIn(email, password, "/overview");
    } catch {
      setError("Could not create account. Please try again.");
      setLoading(false);
    }
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
          Create your account
        </h1>
        <p style={{ fontSize: '13px', color: '#555555', lineHeight: 1.6 }}>
          Deploy your first agent in minutes.
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

        <Field id="name" label="Full name" type="text" autoComplete="name"
          value={name} onChange={setName} placeholder="John Doe" />

        <Field id="email" label="Email" type="email" autoComplete="email"
          value={email} onChange={setEmail} placeholder="you@example.com" />

        <Field id="password" label="Password" type="password" autoComplete="new-password"
          value={password} onChange={setPassword} placeholder="Min. 8 characters" />

        {/* Telegram Widget or Connected Badge */}
        {telegramUser ? (
          <div style={{
            marginTop: '12px',
            background: 'rgba(0,136,204,0.07)',
            border: '0.5px solid rgba(0,136,204,0.35)',
            borderRadius: '10px',
            padding: '13px',
            fontSize: '14px',
            color: '#2AABEE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            Connected as @{telegramUser.username ?? telegramUser.first_name}
          </div>
        ) : (
          <div style={{ marginTop: '12px' }}>
            {/* Real Telegram widget loads here if NEXT_PUBLIC_TELEGRAM_BOT_USERNAME is set */}
            <div id="telegram-widget" style={{ display: 'flex', justifyContent: 'center' }} />
            {/* Static fallback button — always visible unless the real widget loaded */}
            {!widgetLoaded && (
              <button
                type="button"
                onClick={() => window.open("https://t.me/", "_blank")}
                style={{
                  background: 'rgba(0,136,204,0.07)',
                  color: '#2AABEE',
                  border: '0.5px solid rgba(0,136,204,0.35)',
                  borderRadius: '10px',
                  padding: '13px',
                  fontSize: '15px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  letterSpacing: '-0.01em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                Connect to Telegram
              </button>
            )}
          </div>
        )}

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
              Creating account…
            </>
          ) : (
            "Create account →"
          )}
        </button>
      </form>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{
        height: '0.5px',
        background: 'linear-gradient(90deg, transparent, #1E1E1E 20%, #1E1E1E 80%, transparent)',
        margin: '1.75rem 0',
      }} />

      <p style={{ textAlign: 'center', fontSize: '13px', color: '#555555' }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: '#F0EEE8', textDecoration: 'none', fontWeight: 500 }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
