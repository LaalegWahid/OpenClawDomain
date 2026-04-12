"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, CreditCard, RefreshCw, X, AlertTriangle, CheckCircle, Clock, Zap } from "lucide-react";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getStripe } from "../../../shared/lib/stripe/client";

// ── Types ─────────────────────────────────────────────────────────────────

interface BillingAlert {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface TrialStatus {
  isInTrial: boolean;
  trialUsed: boolean;
  daysRemaining: number;
  daysElapsed: number;
  isExpired: boolean;
  needsReminder: boolean;
  trialEndsAt: string | null;
}

interface BillingSummary {
  status: string;
  tier: "starter" | "growth" | "scale";
  pricePerAgent: number;
  agentCount: number;
  monthlyTotal: number;
  hasCard: boolean;
  nextBilledAt: string | null;
  lastBilledAt: string | null;
  trial: TrialStatus;
  alerts: BillingAlert[];
}

interface PaymentMethodData {
  id: string;
  stripePaymentMethodId: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  isDefault: boolean;
}

// ── Design tokens (match landing page exactly) ────────────────────────────

const C = {
  bg:       "#f8f2ed",
  surface:  "#ffffff",
  surface2: "#f1ebe4",
  fg:       "#2a1f19",
  fg2:      "#7a5f52",
  fg3:      "#b09484",
  border:   "#e4d8cf",
  border2:  "#d0c2b7",
  brand:    "#FF4D00",
  success:  "#2FBF71",
  warning:  "#FFB020",
  error:    "#E23D2D",
};

const card: React.CSSProperties = {
  background: C.surface,
  border: `0.5px solid ${C.border}`,
  borderRadius: "12px",
  padding: "1.5rem",
  marginBottom: "1.25rem",
};

const TIER_LABELS: Record<string, string> = {
  starter: "Starter",
  growth:  "Growth",
  scale:   "Scale",
};

const TIER_COLORS: Record<string, string> = {
  starter: C.fg2,
  growth:  C.brand,
  scale:   "#2196F3",
};

// ── Alert type config ─────────────────────────────────────────────────────

function alertConfig(type: string): { color: string; bg: string; borderColor: string; icon: React.ReactNode } {
  switch (type) {
    case "trial_started":
      return { color: C.success, bg: "rgba(47,191,113,0.06)", borderColor: "rgba(47,191,113,0.25)", icon: <CheckCircle size={14} /> };
    case "trial_reminder":
      return { color: C.warning, bg: "rgba(255,176,32,0.06)", borderColor: "rgba(255,176,32,0.25)", icon: <Clock size={14} /> };
    case "trial_expired":
    case "suspended":
    case "payment_failed":
      return { color: C.error, bg: "rgba(226,61,45,0.06)", borderColor: "rgba(226,61,45,0.25)", icon: <AlertTriangle size={14} /> };
    case "card_missing":
      return { color: C.warning, bg: "rgba(255,176,32,0.06)", borderColor: "rgba(255,176,32,0.25)", icon: <CreditCard size={14} /> };
    case "payment_success":
      return { color: C.success, bg: "rgba(47,191,113,0.06)", borderColor: "rgba(47,191,113,0.25)", icon: <CheckCircle size={14} /> };
    default:
      return { color: C.fg2, bg: C.surface2, borderColor: C.border, icon: null };
  }
}

// ── Change Card Form ──────────────────────────────────────────────────────

function ChangeCardForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);

    try {
      const card = elements.getElement(CardElement);
      if (!card) return;

      const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({ type: "card", card });
      if (pmError) { setError(pmError.message ?? "Invalid card"); setLoading(false); return; }

      const res = await fetch("/api/stripe/update-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId: paymentMethod.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Couldn't update card. Please try again.");
        setLoading(false);
        return;
      }
      onSuccess();
    } catch {
      setError("Couldn't update card. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>
      {error && (
        <div style={{
          background: "rgba(226,61,45,0.06)", border: `0.5px solid rgba(226,61,45,0.3)`,
          borderRadius: "8px", padding: "10px 14px", fontSize: "13px",
          color: C.error, marginBottom: "12px",
        }}>
          {error}
        </div>
      )}
      <div style={{
        background: C.surface2, border: `1px solid ${C.border}`,
        borderRadius: "8px", padding: "12px 14px",
      }}>
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "14px", color: C.fg, fontFamily: "inherit",
                "::placeholder": { color: C.fg3 },
              },
              invalid: { color: C.error },
            },
          }}
        />
      </div>
      <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
        <button type="submit" disabled={loading || !stripe} style={{
          background: loading ? C.surface2 : C.brand,
          color: loading ? C.fg3 : "#ffffff",
          border: "none", borderRadius: "8px",
          padding: "10px 20px", fontSize: "13px", fontWeight: 500,
          cursor: loading ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", gap: "6px",
        }}>
          {loading && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
          {loading ? "Updating…" : "Update card"}
        </button>
        <button type="button" onClick={onCancel} disabled={loading} style={{
          background: C.surface2, color: C.fg, border: `0.5px solid ${C.border}`,
          borderRadius: "8px", padding: "10px 20px", fontSize: "13px",
          fontWeight: 500, cursor: "pointer",
        }}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Trial progress bar ────────────────────────────────────────────────────

function TrialBar({ trial }: { trial: TrialStatus }) {
  const pct = Math.min(100, (trial.daysElapsed / 15) * 100);
  const color = trial.daysRemaining <= 3 ? C.error : trial.needsReminder ? C.warning : C.success;

  return (
    <div style={{ ...card, borderColor: `${color}40`, background: `${color}08` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Zap size={14} style={{ color }} />
          <span style={{ fontSize: "13px", fontWeight: 500, color: C.fg }}>Free Trial</span>
        </div>
        <span style={{
          fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em",
          textTransform: "uppercase", color,
        }}>
          {trial.daysRemaining} day{trial.daysRemaining !== 1 ? "s" : ""} left
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ background: C.surface2, borderRadius: "100px", height: "4px", marginBottom: "0.75rem" }}>
        <div style={{ width: `${pct}%`, background: color, borderRadius: "100px", height: "4px", transition: "width 0.3s" }} />
      </div>

      <p style={{ fontSize: "12px", color: C.fg2, lineHeight: 1.5 }}>
        {trial.needsReminder
          ? "Your free trial is almost over. Add a card below to keep your agents running."
          : "Your first agent is free for 15 days. No card required during the trial."}
        {trial.trialEndsAt && (
          <span style={{ display: "block", color: C.fg3, marginTop: "4px" }}>
            Trial ends: {new Date(trial.trialEndsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </span>
        )}
      </p>
    </div>
  );
}

// ── Billing Alerts ────────────────────────────────────────────────────────

function AlertsPanel({ alerts, onDismissAll }: { alerts: BillingAlert[]; onDismissAll: () => void }) {
  const unread = alerts.filter((a) => !a.isRead);
  if (unread.length === 0) return null;

  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.fg3 }}>
          Notifications
        </span>
        <button onClick={onDismissAll} style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: "11px", color: C.fg3, padding: 0,
        }}>
          Dismiss all
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {unread.map((alert) => {
          const cfg = alertConfig(alert.type);
          return (
            <div key={alert.id} style={{
              background: cfg.bg, border: `0.5px solid ${cfg.borderColor}`,
              borderRadius: "10px", padding: "12px 14px",
              display: "flex", alignItems: "flex-start", gap: "10px",
            }}>
              <span style={{ color: cfg.color, flexShrink: 0, marginTop: "1px" }}>{cfg.icon}</span>
              <span style={{ fontSize: "13px", color: C.fg, lineHeight: 1.5, flex: 1 }}>{alert.message}</span>
              <span style={{ fontSize: "11px", color: C.fg3, flexShrink: 0, alignSelf: "center" }}>
                {new Date(alert.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

export function BillingContent() {
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [methods, setMethods] = useState<PaymentMethodData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showChangeCard, setShowChangeCard] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [sumRes, pmRes] = await Promise.all([
        fetch("/api/billing/summary"),
        fetch("/api/stripe/payment-methods"),
      ]);
      const sumData = await sumRes.json();
      const pmData = await pmRes.json();
      setSummary(sumData);
      setMethods(pmData.paymentMethods ?? []);
    } catch {
      setFetchError("Couldn't load billing info. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleDismissAll() {
    await fetch("/api/billing/alerts", { method: "POST" });
    fetchData();
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem 0" }}>
        <Loader2 size={22} style={{ color: C.brand, animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={{
        background: "rgba(226,61,45,0.06)", border: "0.5px solid rgba(226,61,45,0.3)",
        borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: C.error,
      }}>
        {fetchError}
      </div>
    );
  }

  const displayPm = methods.find((m) => m.isDefault) ?? methods[0] ?? null;
  const tierColor = summary ? TIER_COLORS[summary.tier] ?? C.fg2 : C.fg2;
  const isTrialing = summary?.trial?.isInTrial;
  const isSuspended = summary?.status === "suspended";

  return (
    <div style={{ maxWidth: "620px" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Alerts ── */}
      {summary?.alerts && (
        <AlertsPanel alerts={summary.alerts} onDismissAll={handleDismissAll} />
      )}

      {/* ── Trial bar (only when in trial) ── */}
      {isTrialing && summary?.trial && <TrialBar trial={summary.trial} />}

      {/* ── Suspended banner ── */}
      {isSuspended && (
        <div style={{
          background: "rgba(226,61,45,0.06)", border: "0.5px solid rgba(226,61,45,0.3)",
          borderRadius: "10px", padding: "14px 16px", marginBottom: "1.25rem",
          display: "flex", gap: "10px", alignItems: "flex-start",
        }}>
          <AlertTriangle size={16} style={{ color: C.error, flexShrink: 0, marginTop: "1px" }} />
          <div>
            <p style={{ fontSize: "13px", fontWeight: 500, color: C.error, marginBottom: "4px" }}>
              Account suspended
            </p>
            <p style={{ fontSize: "13px", color: C.fg2, lineHeight: 1.5 }}>
              Your agents have been stopped due to a failed payment. Add a valid card below to recover your account.
            </p>
          </div>
        </div>
      )}

      {/* ── Current Plan ── */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
          <div>
            <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.fg3, marginBottom: "6px" }}>
              Current Plan
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span style={{ fontSize: "2rem", fontWeight: 600, letterSpacing: "-0.04em", color: C.fg, fontFamily: "var(--serif)" }}>
                ${summary?.pricePerAgent ?? 20}
              </span>
              <span style={{ fontSize: "12px", color: C.fg3 }}>/ agent / mo</span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{
              display: "inline-block", fontSize: "11px", fontWeight: 600,
              letterSpacing: "0.05em", textTransform: "uppercase",
              padding: "4px 10px", borderRadius: "6px",
              background: `${tierColor}15`, color: tierColor,
              marginBottom: "4px",
            }}>
              {TIER_LABELS[summary?.tier ?? "starter"]}
            </span>
            <p style={{ fontSize: "11px", color: C.fg3 }}>
              {summary?.agentCount ?? 0} active agent{(summary?.agentCount ?? 0) !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Monthly total row */}
        <div style={{
          background: C.surface2, borderRadius: "10px", padding: "14px 16px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: "1rem",
        }}>
          <div>
            <p style={{ fontSize: "11px", color: C.fg3, marginBottom: "3px" }}>Monthly total</p>
            <p style={{ fontSize: "20px", fontWeight: 600, color: C.fg, fontFamily: "var(--serif)", letterSpacing: "-0.03em" }}>
              ${summary?.monthlyTotal?.toFixed(2) ?? "0.00"}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            {summary?.nextBilledAt && (
              <>
                <p style={{ fontSize: "11px", color: C.fg3, marginBottom: "3px" }}>Next billing</p>
                <p style={{ fontSize: "13px", color: C.fg2 }}>
                  {new Date(summary.nextBilledAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              </>
            )}
            {!summary?.nextBilledAt && isTrialing && (
              <p style={{ fontSize: "12px", color: C.fg3 }}>Billing starts after trial</p>
            )}
          </div>
        </div>

        {/* Tier breakdown */}
        <div style={{ borderTop: `0.5px solid ${C.border}`, paddingTop: "1rem" }}>
          <p style={{ fontSize: "11px", color: C.fg3, marginBottom: "8px", fontWeight: 500 }}>Tier structure (auto-selected)</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {[
              { label: "Starter", range: "1–5 agents", price: "$20/agent" },
              { label: "Growth",  range: "6–10 agents", price: "$18/agent" },
              { label: "Scale",   range: "11–20 agents", price: "$15/agent" },
            ].map(({ label, range, price }) => {
              const isCurrentTier = label.toLowerCase() === (summary?.tier ?? "starter");
              return (
                <div key={label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "7px 10px", borderRadius: "8px",
                  background: isCurrentTier ? `${tierColor}0d` : "transparent",
                  border: isCurrentTier ? `0.5px solid ${tierColor}30` : "0.5px solid transparent",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{
                      width: "6px", height: "6px", borderRadius: "50%",
                      background: isCurrentTier ? tierColor : C.fg3, flexShrink: 0,
                    }} />
                    <span style={{ fontSize: "12px", color: isCurrentTier ? C.fg : C.fg2, fontWeight: isCurrentTier ? 500 : 400 }}>
                      {label}
                    </span>
                    <span style={{ fontSize: "11px", color: C.fg3 }}>{range}</span>
                  </div>
                  <span style={{ fontSize: "12px", color: isCurrentTier ? tierColor : C.fg3, fontWeight: isCurrentTier ? 600 : 400 }}>
                    {price}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Payment Method ── */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "13px", fontWeight: 600, color: C.fg }}>Payment Method</h2>
          {!showChangeCard && (
            <button onClick={() => setShowChangeCard(true)} style={{
              background: "none", border: `0.5px solid ${C.border}`, borderRadius: "6px",
              padding: "6px 12px", fontSize: "12px", color: C.fg2, cursor: "pointer",
              display: "flex", alignItems: "center", gap: "4px",
            }}>
              <RefreshCw size={11} /> {displayPm ? "Change" : "Add card"}
            </button>
          )}
        </div>

        {displayPm ? (
          <div style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "12px", background: C.surface2,
            border: `0.5px solid ${C.border}`, borderRadius: "8px",
          }}>
            <CreditCard size={16} style={{ color: C.brand }} />
            <span style={{ fontSize: "13px", color: C.fg, textTransform: "capitalize" }}>
              {displayPm.brand ?? "Card"} •••• {displayPm.last4}
            </span>
            <span style={{ fontSize: "12px", color: C.fg3 }}>
              {String(displayPm.expMonth).padStart(2, "0")}/{displayPm.expYear}
            </span>
          </div>
        ) : (
          <div style={{
            padding: "16px", background: C.surface2, borderRadius: "8px",
            border: `0.5px dashed ${C.border2}`, textAlign: "center",
          }}>
            <CreditCard size={20} style={{ color: C.fg3, margin: "0 auto 8px" }} />
            <p style={{ fontSize: "13px", color: C.fg3 }}>No payment method on file.</p>
            {!isTrialing && (
              <p style={{ fontSize: "12px", color: C.error, marginTop: "4px" }}>
                A card is required to run agents outside the free trial.
              </p>
            )}
          </div>
        )}

        {showChangeCard && (
          <Elements stripe={getStripe()}>
            <ChangeCardForm
              onSuccess={() => { setShowChangeCard(false); fetchData(); }}
              onCancel={() => setShowChangeCard(false)}
            />
          </Elements>
        )}
      </div>

      {/* ── Billing history note ── */}
      {summary?.lastBilledAt && (
        <p style={{ fontSize: "12px", color: C.fg3, textAlign: "center", marginTop: "0.5rem" }}>
          Last charged: {new Date(summary.lastBilledAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>
      )}
    </div>
  );
}
