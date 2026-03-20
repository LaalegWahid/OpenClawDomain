"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, CreditCard, Trash2, Star, Plus, AlertTriangle } from "lucide-react";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getStripe } from "@/shared/lib/stripe/client";

interface PaymentMethodData {
  id: string;
  stripePaymentMethodId: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  isDefault: boolean;
}

interface SubData {
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

/* ── Add Card Form ─────────────────────────────────────── */
function AddCardForm({ onSuccess }: { onSuccess: () => void }) {
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
      const res = await fetch("/api/stripe/setup-intent", { method: "POST" });
      const { clientSecret } = await res.json();

      const card = elements.getElement(CardElement);
      if (!card) return;

      const { setupIntent, error: stripeError } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card },
      });

      if (stripeError) {
        setError(stripeError.message ?? "Failed to add card");
        setLoading(false);
        return;
      }

      if (setupIntent?.payment_method) {
        await fetch("/api/stripe/payment-methods", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentMethodId: setupIntent.payment_method }),
        });
      }

      onSuccess();
    } catch {
      setError("Failed to add card");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>
      <div style={{
        background: "#0A0A0A",
        border: "0.5px solid #1E1E1E",
        borderRadius: "8px",
        padding: "12px 14px",
      }}>
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "14px",
                color: "#F0EEE8",
                "::placeholder": { color: "#555555" },
              },
            },
          }}
        />
      </div>
      {error && (
        <p style={{ color: "#FF4D00", fontSize: "13px", marginTop: "8px" }}>{error}</p>
      )}
      <button
        type="submit"
        disabled={loading || !stripe}
        style={{
          marginTop: "12px",
          background: loading ? "#2A2A2A" : "#FF4D00",
          color: loading ? "#555555" : "#FFFFFF",
          border: "none",
          borderRadius: "8px",
          padding: "10px 20px",
          fontSize: "13px",
          fontWeight: 500,
          cursor: loading ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
        {loading ? "Adding…" : "Add card"}
      </button>
    </form>
  );
}

/* ── Cancel Confirmation Modal ─────────────────────────── */
function CancelModal({ onConfirm, onClose, loading }: {
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.7)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 50,
    }}>
      <div style={{
        background: "#111111",
        border: "0.5px solid #1E1E1E",
        borderRadius: "16px",
        padding: "2rem",
        maxWidth: "400px",
        width: "100%",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1rem" }}>
          <AlertTriangle size={20} style={{ color: "#FF4D00" }} />
          <h3 style={{ fontSize: "16px", fontWeight: 500, color: "#F0EEE8" }}>
            Cancel subscription?
          </h3>
        </div>
        <p style={{ fontSize: "13px", color: "#999999", lineHeight: 1.6, marginBottom: "1.5rem" }}>
          Your subscription will remain active until the end of the current billing period.
          After that, you&apos;ll lose access to all features. You can resume anytime before it expires.
        </p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              background: "#1E1E1E",
              color: "#F0EEE8",
              border: "none",
              borderRadius: "8px",
              padding: "10px 20px",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Keep subscription
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              background: loading ? "#2A2A2A" : "#dc2626",
              color: loading ? "#555555" : "#FFFFFF",
              border: "none",
              borderRadius: "8px",
              padding: "10px 20px",
              fontSize: "13px",
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
            {loading ? "Canceling…" : "Yes, cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Billing Content ──────────────────────────────── */
export function BillingContent() {
  const [sub, setSub] = useState<SubData | null>(null);
  const [methods, setMethods] = useState<PaymentMethodData[]>([]);
  const [loadingSub, setLoadingSub] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    const [subRes, pmRes] = await Promise.all([
      fetch("/api/stripe/subscription"),
      fetch("/api/stripe/payment-methods"),
    ]);
    const subData = await subRes.json();
    const pmData = await pmRes.json();
    setSub(subData);
    setMethods(pmData.paymentMethods ?? []);
    setLoadingSub(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleCancel() {
    setActionLoading(true);
    try {
      await fetch("/api/stripe/cancel", { method: "POST" });
      await fetchData();
      setShowCancelModal(false);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResume() {
    setActionLoading(true);
    try {
      await fetch("/api/stripe/resume", { method: "POST" });
      await fetchData();
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(pmId: string) {
    await fetch(`/api/stripe/payment-methods/${pmId}`, { method: "DELETE" });
    fetchData();
  }

  async function handleSetDefault(pmId: string) {
    await fetch("/api/stripe/default-payment-method", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentMethodId: pmId }),
    });
    fetchData();
  }

  if (loadingSub) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem 0" }}>
        <Loader2 size={24} style={{ color: "#FF4D00", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const isActive = sub?.status === "active";
  const isCanceling = sub?.cancelAtPeriodEnd;

  return (
    <div style={{ maxWidth: "640px" }}>

      {/* Subscription Status */}
      <div style={{
        background: "#111111",
        border: "0.5px solid #1E1E1E",
        borderRadius: "12px",
        padding: "1.5rem",
        marginBottom: "1.5rem",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 500, color: "#F0EEE8" }}>Subscription</h2>
          <span style={{
            fontSize: "11px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            padding: "4px 10px",
            borderRadius: "6px",
            background: isActive
              ? (isCanceling ? "rgba(234,179,8,0.1)" : "rgba(34,197,94,0.1)")
              : "rgba(255,77,0,0.1)",
            color: isActive
              ? (isCanceling ? "#eab308" : "#22c55e")
              : "#FF4D00",
          }}>
            {isCanceling ? "canceling" : (sub?.status ?? "none")}
          </span>
        </div>

        <div style={{ fontSize: "13px", color: "#999999", marginBottom: "1rem" }}>
          <span style={{ fontSize: "24px", fontWeight: 600, color: "#F0EEE8" }}>$20</span>
          <span>/month</span>
          {sub?.currentPeriodEnd && (
            <span style={{ display: "block", marginTop: "4px", color: "#555555" }}>
              {isCanceling ? "Access until" : "Next billing"}:{" "}
              {new Date(sub.currentPeriodEnd).toLocaleDateString("en-US", {
                month: "long", day: "numeric", year: "numeric",
              })}
            </span>
          )}
        </div>

        {isCanceling && (
          <div style={{
            background: "rgba(234,179,8,0.06)",
            border: "0.5px solid rgba(234,179,8,0.3)",
            borderRadius: "8px",
            padding: "10px 14px",
            fontSize: "13px",
            color: "#eab308",
            marginBottom: "1rem",
            lineHeight: 1.6,
          }}>
            Your subscription is set to cancel at the end of the current period.
            You&apos;ll retain access until then.
          </div>
        )}

        <div style={{ display: "flex", gap: "10px" }}>
          {isActive && !isCanceling && (
            <button
              onClick={() => setShowCancelModal(true)}
              style={{
                background: "none",
                border: "0.5px solid #333",
                borderRadius: "8px",
                padding: "10px 20px",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                color: "#999999",
              }}
            >
              Cancel subscription
            </button>
          )}
          {isActive && isCanceling && (
            <button
              onClick={handleResume}
              disabled={actionLoading}
              style={{
                background: actionLoading ? "#2A2A2A" : "#FF4D00",
                color: actionLoading ? "#555555" : "#FFFFFF",
                border: "none",
                borderRadius: "8px",
                padding: "10px 20px",
                fontSize: "13px",
                fontWeight: 500,
                cursor: actionLoading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {actionLoading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
              {actionLoading ? "Resuming…" : "Resume subscription"}
            </button>
          )}
        </div>
      </div>

      {/* Payment Methods */}
      <div style={{
        background: "#111111",
        border: "0.5px solid #1E1E1E",
        borderRadius: "12px",
        padding: "1.5rem",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 500, color: "#F0EEE8" }}>Payment Methods</h2>
          <button
            onClick={() => setShowAddCard(!showAddCard)}
            style={{
              background: "none",
              border: "0.5px solid #1E1E1E",
              borderRadius: "6px",
              padding: "6px 12px",
              fontSize: "12px",
              color: "#F0EEE8",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Plus size={12} /> Add
          </button>
        </div>

        {methods.length === 0 && !showAddCard && (
          <p style={{ fontSize: "13px", color: "#555555" }}>No payment methods saved.</p>
        )}

        {methods.map((pm) => (
          <div
            key={pm.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px",
              background: "#0A0A0A",
              border: `0.5px solid ${pm.isDefault ? "rgba(255,77,0,0.3)" : "#1E1E1E"}`,
              borderRadius: "8px",
              marginBottom: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <CreditCard size={16} style={{ color: pm.isDefault ? "#FF4D00" : "#555555" }} />
              <span style={{ fontSize: "13px", color: "#F0EEE8", textTransform: "capitalize" }}>
                {pm.brand ?? "Card"} •••• {pm.last4}
              </span>
              <span style={{ fontSize: "12px", color: "#555555" }}>
                {String(pm.expMonth).padStart(2, "0")}/{pm.expYear}
              </span>
              {pm.isDefault && (
                <span style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: "rgba(255,77,0,0.1)",
                  color: "#FF4D00",
                }}>
                  Default
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {!pm.isDefault && (
                <button
                  onClick={() => handleSetDefault(pm.stripePaymentMethodId)}
                  title="Set as default"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    color: "#555555",
                  }}
                >
                  <Star size={14} />
                </button>
              )}
              <button
                onClick={() => handleDelete(pm.stripePaymentMethodId)}
                title="Remove"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  color: "#555555",
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {showAddCard && (
          <Elements stripe={getStripe()}>
            <AddCardForm
              onSuccess={() => {
                setShowAddCard(false);
                fetchData();
              }}
            />
          </Elements>
        )}
      </div>

      {showCancelModal && (
        <CancelModal
          onConfirm={handleCancel}
          onClose={() => setShowCancelModal(false)}
          loading={actionLoading}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
