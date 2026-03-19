"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, CreditCard, Trash2, Star, Plus } from "lucide-react";
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

export function BillingContent() {
  const [sub, setSub] = useState<SubData | null>(null);
  const [methods, setMethods] = useState<PaymentMethodData[]>([]);
  const [loadingSub, setLoadingSub] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

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

  async function handlePortal() {
    setPortalLoading(true);
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setPortalLoading(false);
  }

  async function handleDelete(pmId: string) {
    await fetch(`/api/stripe/payment-methods/${pmId}`, { method: "DELETE" });
    fetchData();
  }

  if (loadingSub) {
    return (
      <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={24} style={{ color: "#FF4D00", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", padding: "3rem 2rem" }}>
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>
        <h1 style={{
          fontSize: "1.5rem",
          fontWeight: 500,
          letterSpacing: "-0.03em",
          color: "#F0EEE8",
          marginBottom: "2rem",
        }}>
          Billing
        </h1>

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
              background: sub?.status === "active" ? "rgba(34,197,94,0.1)" : "rgba(255,77,0,0.1)",
              color: sub?.status === "active" ? "#22c55e" : "#FF4D00",
            }}>
              {sub?.status ?? "none"}
            </span>
          </div>

          <div style={{ fontSize: "13px", color: "#999999", marginBottom: "1rem" }}>
            <span style={{ fontSize: "24px", fontWeight: 600, color: "#F0EEE8" }}>$20</span>
            <span>/month</span>
            {sub?.currentPeriodEnd && (
              <span style={{ display: "block", marginTop: "4px", color: "#555555" }}>
                Next billing: {new Date(sub.currentPeriodEnd).toLocaleDateString()}
              </span>
            )}
            {sub?.cancelAtPeriodEnd && (
              <span style={{ display: "block", marginTop: "4px", color: "#FF4D00" }}>
                Cancels at end of period
              </span>
            )}
          </div>

          <button
            onClick={handlePortal}
            disabled={portalLoading}
            style={{
              background: "#1E1E1E",
              color: "#F0EEE8",
              border: "none",
              borderRadius: "8px",
              padding: "10px 20px",
              fontSize: "13px",
              fontWeight: 500,
              cursor: portalLoading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {portalLoading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
            Manage Subscription
          </button>
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
                border: "0.5px solid #1E1E1E",
                borderRadius: "8px",
                marginBottom: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <CreditCard size={16} style={{ color: "#555555" }} />
                <span style={{ fontSize: "13px", color: "#F0EEE8" }}>
                  {pm.brand ?? "Card"} •••• {pm.last4}
                </span>
                <span style={{ fontSize: "12px", color: "#555555" }}>
                  {pm.expMonth}/{pm.expYear}
                </span>
                {pm.isDefault && (
                  <Star size={12} style={{ color: "#FF4D00" }} />
                )}
              </div>
              <button
                onClick={() => handleDelete(pm.stripePaymentMethodId)}
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

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
