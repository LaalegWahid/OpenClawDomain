"use client";

import { useState, useEffect } from "react";
import {
  saveProfile,
  savePassword,
  saveAccount,
} from "@/feature/settings/actions/settings.actions";
import { useRouter } from "next/navigation";


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
        fontSize: "12px", fontWeight: 500,
        letterSpacing: "0.02em", color: "#555555",
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
          background: "#0A0A0A",
          border: `0.5px solid ${focused ? "#FF4D00" : "#1E1E1E"}`,
          borderRadius: "8px",
          padding: "11px 14px",
          fontSize: "14px",
          color: "#F0EEE8",
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
      background: "#111111",
      border: "0.5px solid #1E1E1E",
      borderRadius: "16px",
      padding: "1.75rem",
      display: "flex",
      flexDirection: "column",
      gap: "1.25rem",
    }}>
      <div>
        <div style={{ fontSize: "15px", fontWeight: 500, color: "#F0EEE8", marginBottom: "4px" }}>{title}</div>
        <div style={{ fontSize: "13px", color: "#555555", lineHeight: 1.6 }}>{desc}</div>
      </div>

      <div style={{ height: "0.5px", background: "#1E1E1E" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {children}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
        <button type="submit" style={{
          background: "#FF4D00",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          padding: "10px 20px",
          fontSize: "13px",
          fontWeight: 500,
          cursor: "pointer",
          letterSpacing: "-0.01em",
        }}>
          Save
        </button>
        {saved && (
          <span style={{ fontSize: "12px", color: "#4CAF50" }}>Saved</span>
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

  const [linking, setLinking] = useState(false);

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
  async function handleTelegramLink() {
    setLinking(true);
    try {
      const res = await fetch('/api/link/request', { method: 'POST' });
      const data = await res.json();
      window.open(data.url, '_blank');
    } finally {
      setLinking(false);
    }
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
    <div>
      {/* Heading */}
      <div style={{ marginBottom: "2.5rem" }}>
        <h1 style={{
          fontSize: "clamp(1.4rem, 3vw, 1.9rem)",
          fontWeight: 500,
          letterSpacing: "-0.03em",
          color: "#F0EEE8",
          marginBottom: "6px",
          lineHeight: 1.1,
        }}>
          Settings
        </h1>
        <p style={{ fontSize: "13px", color: "#555555", lineHeight: 1.6 }}>
          Manage your account and preferences.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

        {/* Telegram */}
        <form onSubmit={(e) => { e.preventDefault(); handleTelegramLink(); }} style={{
          background: "#111111",
          border: "0.5px solid #1E1E1E",
          borderRadius: "16px",
          padding: "1.75rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}>
          <div>
            <div style={{ fontSize: "15px", fontWeight: 500, color: "#F0EEE8", marginBottom: "4px" }}>Telegram</div>
            <div style={{ fontSize: "13px", color: "#555555", lineHeight: 1.6 }}>Connect your Telegram account to control your agents.</div>
          </div>
          <div style={{ height: "0.5px", background: "#1E1E1E" }} />
          <button type="submit" disabled={linking} style={{
            background: linking ? "#2A2A2A" : "#2AABEE",
            color: linking ? "#555555" : "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "10px 20px",
            fontSize: "13px",
            fontWeight: 500,
            cursor: linking ? "not-allowed" : "pointer",
          }}>
            {linking ? "Opening..." : "Connect Telegram →"}
          </button>
        </form>
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
              border: "0.5px solid rgba(255,77,0,0.3)",
              borderRadius: "8px",
              padding: "10px 14px",
              fontSize: "13px",
              color: "#FF4D00",
            }}>
              {pwError}
            </div>
          )}
          <Field label="Current password" type="password" value={currentPw} onChange={setCurrentPw} placeholder="••••••••" />
          <Field label="New password" type="password" value={nextPw} onChange={setNextPw} placeholder="Min. 8 characters" />
          <Field label="Confirm new password" type="password" value={confirmPw} onChange={setConfirmPw} placeholder="••••••••" />
        </Card>

        {/* Account */}
        <form onSubmit={handleAccount} style={{
          background: "#111111",
          border: "0.5px solid #1E1E1E",
          borderRadius: "16px",
          padding: "1.75rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}>
          <div>
            <div style={{ fontSize: "15px", fontWeight: 500, color: "#F0EEE8", marginBottom: "4px" }}>Account</div>
            <div style={{ fontSize: "13px", color: "#555555", lineHeight: 1.6 }}>Manage your account preferences and notes.</div>
          </div>
          <div style={{ height: "0.5px", background: "#1E1E1E" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.02em", color: "#555555", textTransform: "uppercase" }}>
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
                background: "#0A0A0A",
                border: `0.5px solid ${prefFocused ? "#FF4D00" : "#1E1E1E"}`,
                borderRadius: "8px",
                padding: "11px 14px",
                fontSize: "14px",
                color: "#F0EEE8",
                outline: "none",
                width: "100%",
                resize: "none",
                transition: "border-color 0.15s",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button type="submit" style={{
              background: "#FF4D00", color: "#fff", border: "none",
              borderRadius: "8px", padding: "10px 20px",
              fontSize: "13px", fontWeight: 500, cursor: "pointer", letterSpacing: "-0.01em",
            }}>
              Save
            </button>
            {account.saved && <span style={{ fontSize: "12px", color: "#4CAF50" }}>Saved</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
