"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { authClient } from "../../../shared/lib/auth/client";
import {
  saveProfile,
  savePassword,
  saveAccount,
  deleteAccount,
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

const DANGER = "#c44a2a";

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

  /* Delete account */
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await deleteAccount();
      if (!res.ok) {
        setDeleteError(res.error ?? "Account deletion failed.");
        setDeleting(false);
        return;
      }
      // Sign out the (now-deleted) session, then send the user to /login.
      await authClient.signOut().catch(() => {});
      router.push("/login");
    } catch {
      setDeleteError("Network error while deleting account.");
      setDeleting(false);
    }
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

        <DangerZoneCard onDelete={() => { setDeleteError(null); setShowDeleteModal(true); }} />
      </div>

      {showDeleteModal && (
        <DeleteAccountModal
          submitting={deleting}
          error={deleteError}
          onCancel={() => { if (!deleting) setShowDeleteModal(false); }}
          onConfirm={handleDeleteAccount}
        />
      )}
    </div>
  );
}

function DangerZoneCard({ onDelete }: { onDelete: () => void }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "1.5rem 1.75rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: 1 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(196,74,42,0.08)", border: "1px solid rgba(196,74,42,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Trash2 size={17} style={{ color: DANGER }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: serif, fontSize: 17, fontWeight: 600, color: "var(--foreground)", marginBottom: 3 }}>Delete account</div>
          <div style={{ fontFamily: mono, fontSize: 11, color: "var(--foreground-3)", letterSpacing: "0.02em", lineHeight: 1.5 }}>
            Permanently remove your account, all agents, and all billing data. This cannot be undone.
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onDelete}
        style={{
          background: "transparent",
          color: DANGER,
          border: `1px solid rgba(196,74,42,0.4)`,
          borderRadius: 8,
          padding: "9px 18px",
          fontFamily: mono,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        Delete
      </button>
    </div>
  );
}

function DeleteAccountModal({
  submitting,
  error,
  onCancel,
  onConfirm,
}: {
  submitting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const canConfirm = confirmText.trim().toUpperCase() === "DELETE" && !submitting;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(28,22,18,0.5)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
      }}
      onClick={() => { if (!submitting) onCancel(); }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "1.75rem",
          width: "100%",
          maxWidth: 460,
          margin: "1rem",
          boxShadow: "0 8px 40px rgba(28,22,18,0.18)",
          position: "relative",
        }}
      >
        <button
          type="button"
          onClick={() => { if (!submitting) onCancel(); }}
          aria-label="Close"
          disabled={submitting}
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            background: "none",
            border: "none",
            cursor: submitting ? "not-allowed" : "pointer",
            color: "var(--foreground-3)",
            padding: 4,
          }}
        >
          <X size={18} />
        </button>

        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: "rgba(196,74,42,0.08)",
            border: "1px solid rgba(196,74,42,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 14,
          }}
        >
          <AlertTriangle size={20} color={DANGER} />
        </div>

        <h2
          style={{
            fontFamily: serif,
            fontSize: 20,
            fontWeight: 600,
            color: "var(--foreground)",
            margin: "0 0 8px",
            letterSpacing: "-0.01em",
          }}
        >
          Delete your account?
        </h2>

        <p style={{ fontFamily: mono, fontSize: 13, color: "var(--foreground-2)", lineHeight: 1.6, margin: "0 0 12px" }}>
          This permanently:
        </p>
        <ul style={{ fontFamily: mono, fontSize: 12, color: "var(--foreground-2)", lineHeight: 1.7, margin: "0 0 16px", paddingLeft: 18 }}>
          <li>Stops and removes every agent you&apos;ve created</li>
          <li>Cancels all subscriptions and detaches your payment methods</li>
          <li>Deletes your Stripe customer record</li>
          <li>Erases your skills, chat history, and all account data</li>
        </ul>
        <p style={{ fontFamily: mono, fontSize: 12, color: "var(--foreground-3)", lineHeight: 1.6, margin: "0 0 12px" }}>
          This cannot be undone. Type <strong style={{ color: DANGER, letterSpacing: "0.05em" }}>DELETE</strong> below to confirm.
        </p>

        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Type DELETE"
          autoFocus
          disabled={submitting}
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "11px 14px",
            fontSize: 13,
            fontFamily: mono,
            color: "var(--foreground)",
            outline: "none",
            width: "100%",
            boxSizing: "border-box",
            letterSpacing: "0.08em",
            marginBottom: 14,
          }}
        />

        {error && (
          <div
            style={{
              background: "rgba(196,74,42,0.06)",
              border: "1px solid rgba(196,74,42,0.3)",
              borderRadius: 8,
              padding: "10px 14px",
              fontFamily: mono,
              fontSize: 12,
              color: DANGER,
              marginBottom: 14,
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={() => { if (!submitting) onCancel(); }}
            disabled={submitting}
            style={{
              flex: 1,
              background: "transparent",
              color: "var(--foreground-2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 11,
              fontFamily: mono,
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            style={{
              flex: 2,
              background: canConfirm ? DANGER : "var(--surface-2)",
              color: canConfirm ? "#fff" : "var(--foreground-3)",
              border: "none",
              borderRadius: 8,
              padding: 11,
              fontFamily: mono,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: canConfirm ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {submitting ? (
              <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Deleting…</>
            ) : (
              <><Trash2 size={14} /> Delete account</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
