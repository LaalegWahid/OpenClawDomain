"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, CreditCard, AlertTriangle, RefreshCw } from "lucide-react";
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

interface SubData {
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

/* ── Change Card Form ──────────────────────────────────── */
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

      const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
        type: "card",
        card,
      });

      if (pmError) {
        setError(pmError.message ?? "Invalid card details");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/stripe/update-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId: paymentMethod.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "We couldn't update your card. Please try again.");
        setLoading(false);
        return;
      }

      onSuccess();
    } catch {
      setError("We couldn't update your card. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>
      {error && (
        <div style={{
          background: "rgba(255,77,0,0.06)",
          border: "0.5px solid rgba(255,77,0,0.3)",
          borderRadius: "8px",
          padding: "10px 14px",
          fontSize: "13px",
          color: "#FF4D00",
          marginBottom: "12px",
        }}>
          {error}
        </div>
      )}
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
                fontFamily: "inherit",
                "::placeholder": { color: "#555555" },
              },
              invalid: { color: "#FF4D00" },
            },
          }}
        />
      </div>
      <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
        <button
          type="submit"
          disabled={loading || !stripe}
          style={{
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
          {loading ? "Updating…" : "Update card"}
        </button>
        <button
          type="button"
          onClick={onCancel}
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
          Cancel
        </button>
      </div>
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
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showChangeCard, setShowChangeCard] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [subRes, pmRes] = await Promise.all([
        fetch("/api/stripe/subscription"),
        fetch("/api/stripe/payment-methods"),
      ]);
      const subData = await subRes.json();
      const pmData = await pmRes.json();
      setSub(subData);
      setMethods(pmData.paymentMethods ?? []);
    } catch {
      setFetchError("We couldn't load your billing info. Please refresh the page.");
    } finally {
      setLoadingSub(false);
    }
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

  if (loadingSub) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem 0" }}>
        <Loader2 size={24} style={{ color: "#FF4D00", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={{
        background: "rgba(255,77,0,0.06)",
        border: "0.5px solid rgba(255,77,0,0.3)",
        borderRadius: "8px",
        padding: "10px 14px",
        fontSize: "13px",
        color: "#FF4D00",
        maxWidth: "640px",
      }}>
        {fetchError}
      </div>
    );
  }

  const isActive = sub?.status === "active";
  const isCanceling = sub?.cancelAtPeriodEnd;
  const displayPm = methods.find((m) => m.isDefault) ?? methods[0] ?? null;

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

      {/* Payment Method */}
      <div style={{
        background: "#111111",
        border: "0.5px solid #1E1E1E",
        borderRadius: "12px",
        padding: "1.5rem",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 500, color: "#F0EEE8" }}>Payment Method</h2>
          {!showChangeCard && (
            <button
              onClick={() => setShowChangeCard(true)}
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
              <RefreshCw size={11} /> Change
            </button>
          )}
        </div>

        {displayPm ? (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px",
            background: "#0A0A0A",
            border: "0.5px solid #1E1E1E",
            borderRadius: "8px",
          }}>
            <CreditCard size={16} style={{ color: "#FF4D00" }} />
            <span style={{ fontSize: "13px", color: "#F0EEE8", textTransform: "capitalize" }}>
              {displayPm.brand ?? "Card"} •••• {displayPm.last4}
            </span>
            <span style={{ fontSize: "12px", color: "#555555" }}>
              {String(displayPm.expMonth).padStart(2, "0")}/{displayPm.expYear}
            </span>
          </div>
        ) : (
          <p style={{ fontSize: "13px", color: "#555555" }}>No payment method on file.</p>
        )}

        {showChangeCard && (
          <Elements stripe={getStripe()}>
            <ChangeCardForm
              onSuccess={() => {
                setShowChangeCard(false);
                fetchData();
              }}
              onCancel={() => setShowChangeCard(false)}
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
