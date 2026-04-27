"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, CreditCard, AlertTriangle, Plus, Star, Trash2, CheckCircle2 } from "lucide-react";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getStripe } from "../../../shared/lib/stripe/client";

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
  active:     { bg: "rgba(34,197,94,0.1)",  fg: "#22c55e" },
  incomplete: { bg: "rgba(234,179,8,0.1)",  fg: "#eab308" },
  past_due:   { bg: "rgba(255,77,0,0.1)",   fg: "#FF4D00" },
  canceled:   { bg: "rgba(120,120,120,0.1)", fg: "#999999" },
  unpaid:     { bg: "rgba(255,77,0,0.1)",   fg: "#FF4D00" },
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

      // Get a SetupIntent client secret from the server
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
        <div style={{ background: "rgba(255,77,0,0.06)", border: "0.5px solid rgba(255,77,0,0.3)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#FF4D00", marginBottom: 12 }}>
          {error}
        </div>
      )}
      <div style={{ background: "#0A0A0A", border: "0.5px solid #1E1E1E", borderRadius: 8, padding: "12px 14px" }}>
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "14px",
                color: "#F0EEE8",
                fontFamily: "inherit",
                "::placeholder": { color: "#555555" },
              },
              invalid: { color: "#FF4D00" },
            },
          }}
        />
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button
          type="submit"
          disabled={loading || !stripe}
          style={{ background: loading ? "#2A2A2A" : "#FF4D00", color: loading ? "#555555" : "#FFFFFF", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}
        >
          {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
          {loading ? "Saving…" : "Save card"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          style={{ background: "#1E1E1E", color: "#F0EEE8", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem 0" }}>
        <Loader2 size={24} style={{ color: "#FF4D00", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={{ background: "rgba(255,77,0,0.06)", border: "0.5px solid rgba(255,77,0,0.3)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#FF4D00", maxWidth: 640 }}>
        {fetchError}
      </div>
    );
  }

  const hasCard = methods.length > 0;

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, color: "#F0EEE8", margin: "0 0 4px" }}>Billing</h1>
      <p style={{ fontSize: 13, color: "#999999", margin: "0 0 1.5rem" }}>
        Manage cards and per-agent subscriptions. A debit/credit card on file is required to create new agents.
      </p>

      {/* No-card warning */}
      {!hasCard && (
        <div style={{ background: "rgba(255,77,0,0.06)", border: "0.5px solid rgba(255,77,0,0.3)", borderRadius: 12, padding: "16px 18px", marginBottom: "1.5rem", display: "flex", gap: 12, alignItems: "flex-start" }}>
          <AlertTriangle size={18} style={{ color: "#FF4D00", flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, color: "#F0EEE8", margin: "0 0 4px" }}>No card on file</p>
            <p style={{ fontSize: 12, color: "#999999", margin: 0, lineHeight: 1.5 }}>
              You must register a debit or credit card before creating an agent. Each agent is billed monthly.
            </p>
          </div>
        </div>
      )}

      {/* Payment Methods */}
      <div style={{ background: "#111111", border: "0.5px solid #1E1E1E", borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: 14, fontWeight: 500, color: "#F0EEE8", margin: 0 }}>Cards</h2>
          {!showAddCard && (
            <button
              onClick={() => setShowAddCard(true)}
              style={{ background: "none", border: "0.5px solid #1E1E1E", borderRadius: 6, padding: "6px 12px", fontSize: 12, color: "#F0EEE8", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
            >
              <Plus size={11} /> Add card
            </button>
          )}
        </div>

        {methods.length === 0 ? (
          <p style={{ fontSize: 13, color: "#555555", margin: 0 }}>No payment methods on file.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {methods.map((pm) => (
              <div
                key={pm.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  background: "#0A0A0A",
                  border: pm.isDefault ? "0.5px solid rgba(255,77,0,0.4)" : "0.5px solid #1E1E1E",
                  borderRadius: 8,
                }}
              >
                <CreditCard size={16} style={{ color: pm.isDefault ? "#FF4D00" : "#999999", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, color: "#F0EEE8", textTransform: "capitalize" }}>
                    {pm.brand ?? "Card"} •••• {pm.last4}
                  </span>
                  <span style={{ fontSize: 11, color: "#555555", marginLeft: 10 }}>
                    {String(pm.expMonth).padStart(2, "0")}/{pm.expYear}
                  </span>
                </div>
                {pm.isDefault ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: "rgba(255,77,0,0.1)", color: "#FF4D00", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    <Star size={10} /> Default
                  </span>
                ) : (
                  <button
                    onClick={() => handleSetDefault(pm)}
                    disabled={actionLoading === pm.id}
                    style={{ background: "none", border: "0.5px solid #1E1E1E", borderRadius: 6, padding: "5px 10px", fontSize: 11, color: "#F0EEE8", cursor: actionLoading === pm.id ? "not-allowed" : "pointer" }}
                  >
                    Set default
                  </button>
                )}
                <button
                  onClick={() => handleRemove(pm)}
                  disabled={actionLoading === pm.id}
                  title="Remove card"
                  style={{ background: "none", border: "none", color: "#555555", cursor: actionLoading === pm.id ? "not-allowed" : "pointer", padding: 4, display: "flex" }}
                >
                  {actionLoading === pm.id ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={13} />}
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
      </div>

      {/* Per-Agent Subscriptions */}
      <div style={{ background: "#111111", border: "0.5px solid #1E1E1E", borderRadius: 12, padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: 14, fontWeight: 500, color: "#F0EEE8", margin: 0 }}>Agent Subscriptions</h2>
          <span style={{ fontSize: 11, color: "#555555" }}>$20/month per agent</span>
        </div>

        {subs.length === 0 ? (
          <p style={{ fontSize: 13, color: "#555555", margin: 0 }}>No agent subscriptions yet. Create an agent to start your first subscription.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {subs.map((s) => {
              const colors = STATUS_COLORS[s.status] ?? STATUS_COLORS.canceled;
              return (
                <div
                  key={s.id}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: "#0A0A0A", border: "0.5px solid #1E1E1E", borderRadius: 8 }}
                >
                  <CheckCircle2 size={16} style={{ color: colors.fg, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, color: "#F0EEE8", margin: 0, fontWeight: 500 }}>
                      {s.agentName ?? <span style={{ color: "#555555" }}>(deleted agent)</span>}
                    </p>
                    {s.currentPeriodEnd && (
                      <p style={{ fontSize: 11, color: "#555555", margin: "2px 0 0" }}>
                        {s.cancelAtPeriodEnd ? "Ends" : "Renews"}{" "}
                        {new Date(s.currentPeriodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: colors.bg, color: colors.fg, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {s.cancelAtPeriodEnd ? "canceling" : s.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
