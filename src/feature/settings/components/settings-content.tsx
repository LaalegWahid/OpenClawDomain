"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  saveProfile,
  savePassword,
  saveAccount,
} from "../actions/settings.actions";
import {
  BillingLink,
  Card,
  ErrorBanner,
  Field,
  TextareaField,
  mono,
  serif,
  useSaved,
} from "./shared";

interface SettingsContentProps {
  userName?: string | null;
  userEmail?: string | null;
}

export function SettingsContent({ userName, userEmail }: SettingsContentProps) {
  const router = useRouter();

  /* Profile */
  const [name, setName] = useState(userName ?? "");
  const [email, setEmail] = useState(userEmail ?? "");
  const profile = useSaved();

  function handleProfile(e: React.FormEvent) {
    e.preventDefault();
    saveProfile({ name, email });
    profile.flash();
  }

  /* Security */
  const [currentPw, setCurrentPw] = useState("");
  const [nextPw, setNextPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
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

  /* Account */
  const [preferences, setPreferences] = useState("");
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
          lineHeight: 1.1,
          margin: "0 0 6px",
        }}>
          Profile
        </h1>
        <p style={{ fontFamily: mono, fontSize: 12, color: "var(--foreground-3)", lineHeight: 1.6, letterSpacing: "0.02em", margin: 0 }}>
          Manage your account and preferences.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        <Card title="Profile" desc="Update your display name and email address." onSubmit={handleProfile} saved={profile.saved}>
          <Field label="Full name" value={name} onChange={setName} placeholder="John Doe" />
          <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
        </Card>

        <Card title="Security" desc="Change your password to keep your account secure." onSubmit={handlePassword} saved={security.saved}>
          {pwError && <ErrorBanner message={pwError} />}
          <Field label="Current password" type="password" value={currentPw} onChange={setCurrentPw} placeholder="••••••••" />
          <Field label="New password" type="password" value={nextPw} onChange={setNextPw} placeholder="Min. 8 characters" />
          <Field label="Confirm new password" type="password" value={confirmPw} onChange={setConfirmPw} placeholder="••••••••" />
        </Card>

        <BillingLink />

        <Card title="Account" desc="Manage your account preferences and notes." onSubmit={handleAccount} saved={account.saved}>
          <TextareaField label="Preferences" value={preferences} onChange={setPreferences} placeholder="Any preferences or notes…" />
        </Card>
      </div>
    </div>
  );
}
