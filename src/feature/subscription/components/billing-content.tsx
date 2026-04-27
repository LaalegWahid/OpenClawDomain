"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, CreditCard, AlertTriangle, Plus, Star, Trash2, CheckCircle2 } from "lucide-react";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getStripe } from "../../../shared/lib/stripe/client";

const serif = "var(--serif), 'Cormorant Garamond', Georgia, serif";
const mono = "var(--mono), 'JetBrains Mono', monospace";

interface PaymentMethodData {
  id: string;
  stripePaymentMethodId: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  isDefault: boolean;
}

interface AgentSubData {
  id: string;
  agentId: string | null;
  agentName: string | null;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  active:     { bg: "rgba(76,175,80,0.10)",  fg: "#3d8a40" },
  incomplete: { bg: "rgba(234,179,8,0.10)",  fg: "#a07a08" },
  past_due:   { bg: "rgba(255,77,0,0.10)",   fg: "#FF4D00" },
  canceled:   { bg: "rgba(42,31,25,0.06)",   fg: "#8a7060" },
  unpaid:     { bg: "rgba(255,77,0,0.10)",   fg: "#FF4D00" },
};

/* ── Add Card Form (SetupIntent-based) ────────────────── */
function AddCardForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
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

      const setupRes = await fetch("/api/stripe/setup-intent", { method: "POST" });
      const setupData = await setupRes.json();
      if (!setupRes.ok || !setupData.clientSecret) {
        setError(setupData.error ?? "Could not start card setup.");
        setLoading(false);
        return;
      }

      const result = await stripe.confirmCardSetup(setupData.clientSecret, {
        payment_method: { card },
      });

      if (result.error) {
        setError(result.error.message ?? "Invalid card details");
        setLoading(false);
        return;
      }

      const pmId = typeof result.setupIntent.payment_method === "string"
        ? result.setupIntent.payment_method
        : result.setupIntent.payment_method?.id;
      if (!pmId) {
        setError("Card setup did not return a payment method.");
        setLoading(false);
        return;
      }

      const attachRes = await fetch("/api/stripe/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId: pmId }),
      });

      if (!attachRes.ok) {
        const data = await attachRes.json().catch(() => ({}));
        setError(data.error ?? "We couldn't save the card. Please try again.");
        setLoading(false);
        return;
      }

      onSuccess();
    } catch {
      setError("We couldn't save the card. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>
      {error && (
        <div style={{ background: "rgba(255,77,0,0.06)", border: "0.5px solid rgba(255,77,0,0.25)", borderRadius: 10, padding: "10px 14px", fontFamily: mono, fontSize: 12, color: "#FF4D00", marginBottom: 12 }}>
          {error}
        </div>
      )}
      <div style={{ background: "rgba(42,31,25,0.03)", border: "0.5px solid rgba(42,31,25,0.15)", borderRadius: 10, padding: "14px 16px" }}>
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "14px",
                color: "#2a1f19",
                fontFamily: "inherit",
                "::placeholder": { color: "#8a7060" },
              },
              invalid: { color: "#FF4D00" },
            },
          }}
        />
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button
          type="submit"
          disabled={loading || !stripe}
          style={{
            background: loading ? "rgba(42,31,25,0.06)" : "#FF4D00",
            color: loading ? "#8a7060" : "#FFFFFF",
            border: "none",
            borderRadius: 10,
            padding: "11px 22px",
            fontFamily: mono,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
          }}
        >
          {loading ? <Loader2 size={14} style={{ animation: "billingSpin 1s linear infinite" }} /> : null}
          {loading ? "Saving…" : "Save card"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          style={{
            background: "rgba(42,31,25,0.05)",
            color: "#4a3a30",
            border: "0.5px solid rgba(42,31,25,0.15)",
            borderRadius: 10,
            padding: "11px 22px",
            fontFamily: mono,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

/* ── Main Billing Content ────────────────────────────── */
export function BillingContent() {
  const [methods, setMethods] = useState<PaymentMethodData[]>([]);
  const [subs, setSubs] = useState<AgentSubData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [pmRes, subRes] = await Promise.all([
        fetch("/api/stripe/payment-methods"),
        fetch("/api/stripe/agent-subscriptions"),
      ]);
      const pmData = await pmRes.json();
      const subData = await subRes.json();
      setMethods(pmData.paymentMethods ?? []);
      setSubs(subData.subscriptions ?? []);
    } catch {
      setFetchError("We couldn't load your billing info. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSetDefault(pm: PaymentMethodData) {
    if (pm.isDefault) return;
    setActionLoading(pm.id);
    try {
      await fetch("/api/stripe/default-payment-method", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId: pm.stripePaymentMethodId }),
      });
      await fetchData();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRemove(pm: PaymentMethodData) {
    if (!confirm(`Remove the ${pm.brand} card ending in ${pm.last4}?`)) return;
    setActionLoading(pm.id);
    try {
      await fetch(`/api/stripe/payment-methods/${pm.stripePaymentMethodId}`, { method: "DELETE" });
      await fetchData();
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem 0", color: "#2a1f19" }}>
        <Loader2 size={24} style={{ color: "#FF4D00", animation: "billingSpin 1s linear infinite" }} />
        <style>{`@keyframes billingSpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={{ background: "rgba(255,77,0,0.06)", border: "0.5px solid rgba(255,77,0,0.25)", borderRadius: 10, padding: "12px 16px", fontFamily: mono, fontSize: 12, color: "#FF4D00", maxWidth: 720 }}>
        {fetchError}
      </div>
    );
  }

  const hasCard = methods.length > 0;

  return (
    <div style={{ maxWidth: 720, color: "#2a1f19" }}>
      {/* Heading */}
      <div style={{ marginBottom: "2.25rem" }}>
        <h1
          style={{
            fontFamily: serif,
            fontSize: "clamp(1.8rem, 3vw, 2.4rem)",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "#2a1f19",
            margin: "0 0 8px",
            lineHeight: 1.1,
          }}
        >
          Billing &amp; <em style={{ fontStyle: "italic", color: "#FF4D00" }}>subscriptions</em>
        </h1>
        <p style={{ fontFamily: mono, fontSize: 12, color: "#8a7060", lineHeight: 1.7, letterSpacing: "0.02em", margin: 0 }}>
          Manage cards and per-agent subscriptions. A card on file is required to create new agents.
        </p>
      </div>

      {/* No-card warning */}
      {!hasCard && (
        <div
          style={{
            background: "rgba(255,77,0,0.06)",
            border: "0.5px solid rgba(255,77,0,0.25)",
            borderRadius: 14,
            padding: "16px 18px",
            marginBottom: "1.75rem",
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <AlertTriangle size={18} style={{ color: "#FF4D00", flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontFamily: serif, fontSize: 16, fontWeight: 600, color: "#2a1f19", margin: "0 0 4px", letterSpacing: "-0.01em" }}>
              No card on file
            </p>
            <p style={{ fontFamily: mono, fontSize: 12, color: "#8a7060", margin: 0, lineHeight: 1.7 }}>
              Register a debit or credit card before creating an agent. Each agent is billed monthly.
            </p>
          </div>
        </div>
      )}

      {/* ── Payment Methods card ─────────────────────────── */}
      <section
        style={{
          background: "#fff",
          border: "0.5px solid rgba(42,31,25,0.15)",
          borderRadius: 16,
          padding: "1.75rem",
          marginBottom: "1.5rem",
          boxShadow: "0 4px 24px rgba(42,31,25,0.04)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div>
            <h2 style={{ fontFamily: serif, fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em", color: "#2a1f19", margin: 0 }}>
              Cards
            </h2>
            <p style={{ fontFamily: mono, fontSize: 11, color: "#8a7060", margin: "4px 0 0", letterSpacing: "0.02em" }}>
              Set one as default — it will be billed for new agents.
            </p>
          </div>
          {!showAddCard && (
            <button
              onClick={() => setShowAddCard(true)}
              style={{
                background: "rgba(42,31,25,0.05)",
                color: "#4a3a30",
                border: "0.5px solid rgba(42,31,25,0.15)",
                borderRadius: 10,
                padding: "9px 16px",
                fontFamily: mono,
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Plus size={12} /> Add card
            </button>
          )}
        </div>

        {methods.length === 0 ? (
          <p style={{ fontFamily: mono, fontSize: 13, color: "#8a7060", margin: 0 }}>No payment methods on file.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {methods.map((pm) => (
              <div
                key={pm.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 16px",
                  background: pm.isDefault ? "rgba(255,77,0,0.04)" : "rgba(42,31,25,0.025)",
                  border: pm.isDefault ? "0.5px solid rgba(255,77,0,0.35)" : "0.5px solid rgba(42,31,25,0.10)",
                  borderRadius: 12,
                  transition: "border-color 0.15s ease, background 0.15s ease",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: pm.isDefault ? "rgba(255,77,0,0.10)" : "rgba(42,31,25,0.05)",
                    border: pm.isDefault ? "0.5px solid rgba(255,77,0,0.20)" : "0.5px solid rgba(42,31,25,0.08)",
                    flexShrink: 0,
                  }}
                >
                  <CreditCard size={16} style={{ color: pm.isDefault ? "#FF4D00" : "#8a7060" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: mono, fontSize: 13, color: "#2a1f19", margin: 0, fontWeight: 500, textTransform: "capitalize" }}>
                    {pm.brand ?? "Card"} •••• {pm.last4}
                  </p>
                  <p style={{ fontFamily: mono, fontSize: 11, color: "#8a7060", margin: "2px 0 0", letterSpacing: "0.02em" }}>
                    Expires {String(pm.expMonth).padStart(2, "0")}/{pm.expYear}
                  </p>
                </div>
                {pm.isDefault ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontFamily: mono,
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "4px 10px",
                      borderRadius: 6,
                      background: "rgba(255,77,0,0.10)",
                      color: "#FF4D00",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    <Star size={10} /> Default
                  </span>
                ) : (
                  <button
                    onClick={() => handleSetDefault(pm)}
                    disabled={actionLoading === pm.id}
                    style={{
                      background: "transparent",
                      border: "0.5px solid rgba(42,31,25,0.15)",
                      borderRadius: 8,
                      padding: "6px 12px",
                      fontFamily: mono,
                      fontSize: 11,
                      color: "#4a3a30",
                      cursor: actionLoading === pm.id ? "not-allowed" : "pointer",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    Set default
                  </button>
                )}
                <button
                  onClick={() => handleRemove(pm)}
                  disabled={actionLoading === pm.id}
                  title="Remove card"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#8a7060",
                    cursor: actionLoading === pm.id ? "not-allowed" : "pointer",
                    padding: 6,
                    display: "flex",
                    borderRadius: 8,
                    transition: "color 0.15s ease, background 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#FF4D00";
                    e.currentTarget.style.background = "rgba(255,77,0,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#8a7060";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {actionLoading === pm.id ? (
                    <Loader2 size={14} style={{ animation: "billingSpin 1s linear infinite" }} />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {showAddCard && (
          <Elements stripe={getStripe()}>
            <AddCardForm
              onSuccess={() => { setShowAddCard(false); fetchData(); }}
              onCancel={() => setShowAddCard(false)}
            />
          </Elements>
        )}
      </section>

      {/* ── Per-Agent Subscriptions card ─────────────────── */}
      <section
        style={{
          background: "#fff",
          border: "0.5px solid rgba(42,31,25,0.15)",
          borderRadius: 16,
          padding: "1.75rem",
          boxShadow: "0 4px 24px rgba(42,31,25,0.04)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.25rem", flexWrap: "wrap", gap: 8 }}>
          <div>
            <h2 style={{ fontFamily: serif, fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em", color: "#2a1f19", margin: 0 }}>
              Agent <em style={{ fontStyle: "italic", color: "#FF4D00" }}>subscriptions</em>
            </h2>
            <p style={{ fontFamily: mono, fontSize: 11, color: "#8a7060", margin: "4px 0 0", letterSpacing: "0.02em" }}>
              One monthly subscription per agent.
            </p>
          </div>
          <span
            style={{
              fontFamily: mono,
              fontSize: 11,
              color: "#4a3a30",
              padding: "5px 12px",
              borderRadius: 999,
              background: "rgba(42,31,25,0.05)",
              border: "0.5px solid rgba(42,31,25,0.10)",
              letterSpacing: "0.04em",
            }}
          >
            $20<span style={{ color: "#8a7060" }}>/month per agent</span>
          </span>
        </div>

        {subs.length === 0 ? (
          <p style={{ fontFamily: mono, fontSize: 13, color: "#8a7060", margin: 0, lineHeight: 1.7 }}>
            No agent subscriptions yet. Create an agent from the overview to start your first one.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {subs.map((s) => {
              const colors = STATUS_COLORS[s.status] ?? STATUS_COLORS.canceled;
              return (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 16px",
                    background: "rgba(42,31,25,0.025)",
                    border: "0.5px solid rgba(42,31,25,0.10)",
                    borderRadius: 12,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: colors.bg,
                      border: `0.5px solid ${colors.fg}25`,
                      flexShrink: 0,
                    }}
                  >
                    <CheckCircle2 size={16} style={{ color: colors.fg }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: serif, fontSize: 15, color: "#2a1f19", margin: 0, fontWeight: 600, letterSpacing: "-0.01em" }}>
                      {s.agentName ?? <em style={{ color: "#8a7060", fontStyle: "italic", fontWeight: 500 }}>(deleted agent)</em>}
                    </p>
                    {s.currentPeriodEnd && (
                      <p style={{ fontFamily: mono, fontSize: 11, color: "#8a7060", margin: "3px 0 0", letterSpacing: "0.02em" }}>
                        {s.cancelAtPeriodEnd ? "Ends" : "Renews"}{" "}
                        {new Date(s.currentPeriodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                  </div>
                  <span
                    style={{
                      fontFamily: mono,
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "4px 10px",
                      borderRadius: 6,
                      background: colors.bg,
                      color: colors.fg,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {s.cancelAtPeriodEnd ? "canceling" : s.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <style>{`@keyframes billingSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
