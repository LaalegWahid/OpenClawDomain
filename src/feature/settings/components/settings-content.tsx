"use client";

import { useState, useEffect } from "react";
import {
  saveProfile,
  savePassword,
  saveAccount,
} from "../actions/settings.actions";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CreditCard, ChevronRight, Trash2, AlertTriangle } from "lucide-react";

const mono  = "var(--mono), 'JetBrains Mono', monospace";
const serif = "var(--serif), 'Cormorant Garamond', Georgia, serif";

function useSaved() {
  const [saved, setSaved] = useState(false);
  function flash() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }
  return { saved, flash };
}

function Field({
  label, type = "text", value, onChange, placeholder,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{
        fontFamily: mono, fontSize: "11px", fontWeight: 500,
        letterSpacing: "0.08em", color: "var(--foreground-2)",
        textTransform: "uppercase",
      }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          background: "var(--surface-2)",
          border: `1px solid ${focused ? "#FF4D00" : "var(--border)"}`,
          borderRadius: "8px",
          padding: "11px 14px",
          fontSize: "13px",
          fontFamily: mono,
          color: "var(--foreground)",
          outline: "none",
          width: "100%",
          transition: "border-color 0.15s",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}

function Card({ title, desc, children, onSubmit, saved }: {
  title: string;
  desc: string;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  saved: boolean;
}) {
  return (
    <form onSubmit={onSubmit} style={{
      background: "#fff",
      border: "1px solid var(--border)",
      borderRadius: "14px",
      padding: "1.75rem",
      display: "flex",
      flexDirection: "column",
      gap: "1.25rem",
    }}>
      <div>
        <div style={{ fontFamily: serif, fontSize: "18px", fontWeight: 600, color: "var(--foreground)", marginBottom: "4px" }}>{title}</div>
        <div style={{ fontFamily: mono, fontSize: "12px", color: "var(--foreground-3)", lineHeight: 1.6, letterSpacing: "0.02em" }}>{desc}</div>
      </div>

      <div style={{ height: "1px", background: "var(--border)" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {children}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
        <button type="submit" style={{
          background: "#FF4D00",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          padding: "9px 22px",
          fontFamily: mono,
          fontSize: "11px",
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          cursor: "pointer",
        }}>
          Save
        </button>
        {saved && (
          <span style={{ fontFamily: mono, fontSize: "11px", color: "#2FBF71", letterSpacing: "0.04em" }}>Saved ✓</span>
        )}
      </div>
    </form>
  );
}

interface SettingsContentProps {
  userName?: string | null;
  userEmail?: string | null;
}

export function SettingsContent({ userName, userEmail }: SettingsContentProps) {
  /* ── Profile ── */
  const [name, setName] = useState(userName ?? "");
  const [email, setEmail] = useState(userEmail ?? "");
  const profile = useSaved();

  function handleProfile(e: React.FormEvent) {
    e.preventDefault();
    saveProfile({ name, email });
    profile.flash();
  }

  /* ── Security ── */
  const [currentPw, setCurrentPw] = useState("");
  const [nextPw, setNextPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const router = useRouter();
  const security = useSaved();

  function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    if (nextPw !== confirmPw) { setPwError("New passwords do not match."); return; }
    if (nextPw.length < 8) { setPwError("Password must be at least 8 characters."); return; }
    savePassword({ current: currentPw, next: nextPw, confirm: confirmPw });
    setCurrentPw(""); setNextPw(""); setConfirmPw("");
    security.flash();
  }

  useEffect(() => {
    if (!userName && !userEmail) {
      router.push("/login");
    }
  }, [userName, userEmail, router]);

  /* ── Account ── */
  const [preferences, setPreferences] = useState("");
  const [prefFocused, setPrefFocused] = useState(false);
  const account = useSaved();

  function handleAccount(e: React.FormEvent) {
    e.preventDefault();
    saveAccount({ preferences });
    account.flash();
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      {/* Heading */}
      <div style={{ marginBottom: "2.5rem" }}>
        <h1 style={{
          fontFamily: serif,
          fontSize: "clamp(1.8rem, 3vw, 2.4rem)",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: "var(--foreground)",
          marginBottom: "6px",
          lineHeight: 1.1,
          margin: "0 0 6px",
        }}>
          Profile
        </h1>
        <p style={{ fontFamily: mono, fontSize: "12px", color: "var(--foreground-3)", lineHeight: 1.6, letterSpacing: "0.02em", margin: 0 }}>
          Manage your account and preferences.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

        {/* Profile */}
        <Card title="Profile" desc="Update your display name and email address." onSubmit={handleProfile} saved={profile.saved}>
          <Field label="Full name" value={name} onChange={setName} placeholder="John Doe" />
          <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
        </Card>

        {/* Security */}
        <Card title="Security" desc="Change your password to keep your account secure." onSubmit={handlePassword} saved={security.saved}>
          {pwError && (
            <div style={{
              background: "rgba(255,77,0,0.06)",
              border: "1px solid rgba(255,77,0,0.25)",
              borderRadius: "8px",
              padding: "10px 14px",
              fontFamily: mono, fontSize: "12px",
              color: "#FF4D00",
            }}>
              {pwError}
            </div>
          )}
          <Field label="Current password" type="password" value={currentPw} onChange={setCurrentPw} placeholder="••••••••" />
          <Field label="New password" type="password" value={nextPw} onChange={setNextPw} placeholder="Min. 8 characters" />
          <Field label="Confirm new password" type="password" value={confirmPw} onChange={setConfirmPw} placeholder="••••••••" />
        </Card>

        {/* Billing */}
        <Link href="/settings/billing" style={{ textDecoration: "none" }}>
          <div style={{
            background: "#fff",
            border: "1px solid var(--border)",
            borderRadius: "14px",
            padding: "1.5rem 1.75rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            transition: "border-color 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = "#FF4D00")}
          onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "rgba(255,77,0,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CreditCard size={17} style={{ color: "#FF4D00" }} />
              </div>
              <div>
                <div style={{ fontFamily: serif, fontSize: "17px", fontWeight: 600, color: "var(--foreground)", marginBottom: "3px" }}>Billing</div>
                <div style={{ fontFamily: mono, fontSize: "11px", color: "var(--foreground-3)", letterSpacing: "0.02em" }}>
                  Manage your subscription, payment methods, and invoices.
                </div>
              </div>
            </div>
            <ChevronRight size={16} style={{ color: "var(--foreground-3)", flexShrink: 0 }} />
          </div>
        </Link>

        {/* Account */}
        <form onSubmit={handleAccount} style={{
          background: "#fff",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "1.75rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}>
          <div>
            <div style={{ fontFamily: serif, fontSize: "18px", fontWeight: 600, color: "var(--foreground)", marginBottom: "4px" }}>Account</div>
            <div style={{ fontFamily: mono, fontSize: "12px", color: "var(--foreground-3)", lineHeight: 1.6, letterSpacing: "0.02em" }}>Manage your account preferences and notes.</div>
          </div>
          <div style={{ height: "1px", background: "var(--border)" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontFamily: mono, fontSize: "11px", fontWeight: 500, letterSpacing: "0.08em", color: "var(--foreground-2)", textTransform: "uppercase" }}>
              Preferences
            </label>
            <textarea
              value={preferences}
              onChange={e => setPreferences(e.target.value)}
              rows={4}
              placeholder="Any preferences or notes…"
              onFocus={() => setPrefFocused(true)}
              onBlur={() => setPrefFocused(false)}
              style={{
                background: "var(--surface-2)",
                border: `1px solid ${prefFocused ? "#FF4D00" : "var(--border)"}`,
                borderRadius: "8px",
                padding: "11px 14px",
                fontSize: "13px",
                fontFamily: mono,
                color: "var(--foreground)",
                outline: "none",
                width: "100%",
                resize: "none",
                transition: "border-color 0.15s",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button type="submit" style={{
              background: "#FF4D00", color: "#fff", border: "none",
              borderRadius: "8px", padding: "9px 22px",
              fontFamily: mono, fontSize: "11px", fontWeight: 500,
              letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
            }}>
              Save
            </button>
            {account.saved && <span style={{ fontFamily: mono, fontSize: "11px", color: "#2FBF71", letterSpacing: "0.04em" }}>Saved ✓</span>}
          </div>
        </form>

        {/* ── Danger Zone ── */}
        <DangerZone />

      </div>
    </div>
  );
}

// ── Danger Zone ───────────────────────────────────────────────────────────

function DangerZone() {
  const mono  = "var(--mono), 'JetBrains Mono', monospace";
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const CONFIRM_PHRASE = "delete my account";

  async function handleDelete() {
    if (confirmText.trim().toLowerCase() !== CONFIRM_PHRASE) {
      setError(`Type "${CONFIRM_PHRASE}" exactly to confirm.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/user/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to delete account. Please try again.");
        setLoading(false);
        return;
      }

      // Sign out and redirect to home
      router.push("/");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div style={{
      background: "#fff",
      border: "1px solid rgba(226,61,45,0.25)",
      borderRadius: "14px",
      padding: "1.75rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
        <AlertTriangle size={16} style={{ color: "#E23D2D", flexShrink: 0 }} />
        <span style={{ fontFamily: mono.split(",")[0], fontSize: "13px", fontWeight: 600, color: "#E23D2D", letterSpacing: "0.04em" }}>
          Danger Zone
        </span>
      </div>
      <p style={{ fontFamily: mono, fontSize: "12px", color: "var(--foreground-2)", lineHeight: 1.6, marginBottom: "1.25rem" }}>
        Permanently delete your account, stop all running agents, cancel billing, and erase all data.
        This action is <strong style={{ color: "var(--foreground)" }}>irreversible</strong>.
      </p>

      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "rgba(226,61,45,0.06)",
            color: "#E23D2D",
            border: "0.5px solid rgba(226,61,45,0.3)",
            borderRadius: "8px",
            padding: "9px 18px",
            fontFamily: mono,
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          <Trash2 size={13} />
          Delete account
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <p style={{ fontFamily: mono, fontSize: "12px", color: "var(--foreground-2)" }}>
            Type <strong style={{ color: "var(--foreground)" }}>{CONFIRM_PHRASE}</strong> to confirm:
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            style={{
              background: "var(--surface-2)",
              border: "1px solid rgba(226,61,45,0.3)",
              borderRadius: "8px",
              padding: "10px 14px",
              fontSize: "13px",
              fontFamily: mono,
              color: "var(--foreground)",
              outline: "none",
              width: "100%",
              boxSizing: "border-box",
            }}
          />
          {error && (
            <p style={{ fontFamily: mono, fontSize: "12px", color: "#E23D2D" }}>{error}</p>
          )}
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleDelete}
              disabled={loading}
              style={{
                background: loading ? "var(--surface-2)" : "#E23D2D",
                color: loading ? "var(--foreground-3)" : "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "9px 20px",
                fontFamily: mono,
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {loading && <span style={{ display: "inline-block", width: "12px", height: "12px", border: "2px solid #fff4", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}
              {loading ? "Deleting…" : "Confirm delete"}
            </button>
            <button
              onClick={() => { setShowConfirm(false); setConfirmText(""); setError(null); }}
              disabled={loading}
              style={{
                background: "none",
                color: "var(--foreground-2)",
                border: "0.5px solid var(--border)",
                borderRadius: "8px",
                padding: "9px 20px",
                fontFamily: mono,
                fontSize: "11px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
