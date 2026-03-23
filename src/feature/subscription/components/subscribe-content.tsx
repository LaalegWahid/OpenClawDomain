"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Lock } from "lucide-react";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getStripe } from "../../../shared/lib/stripe/client";

const FEATURES = [
  "Unlimited AI agent deployments",
  "Real-time Telegram bot management",
  "Priority support & updates",
  "Full API access with rate limiting",
];

function PaymentForm() {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

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

      // Create payment method
      const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
        type: "card",
        card,
      });

      if (pmError) {
        setError(pmError.message ?? "Invalid card details");
        setLoading(false);
        return;
      }

      // Create subscription
      const res = await fetch("/api/stripe/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId: paymentMethod.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to create subscription");
        setLoading(false);
        return;
      }

      // Handle 3D Secure / SCA
      if (data.status === "requires_action" && data.clientSecret) {
        const { error: confirmError } = await stripe.confirmCardPayment(data.clientSecret);
        if (confirmError) {
          setError(confirmError.message ?? "Payment authentication failed");
          setLoading(false);
          return;
        }
      }

      // Success — redirect to dashboard
      router.push("/overview");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {error && (
        <div style={{
          background: "rgba(255,77,0,0.06)",
          border: "0.5px solid rgba(255,77,0,0.3)",
          borderRadius: "8px",
          padding: "10px 14px",
          fontSize: "13px",
          color: "#FF4D00",
        }}>
          {error}
        </div>
      )}

      <div>
        <label style={{
          fontSize: "12px",
          fontWeight: 500,
          letterSpacing: "0.02em",
          color: "#555555",
          textTransform: "uppercase",
          display: "block",
          marginBottom: "6px",
        }}>
          Card details
        </label>
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
      </div>

      <button
        type="submit"
        disabled={loading || !stripe}
        style={{
          width: "100%",
          background: loading ? "#2A2A2A" : "#FF4D00",
          color: loading ? "#555555" : "#FFFFFF",
          border: "none",
          borderRadius: "10px",
          padding: "13px",
          fontSize: "15px",
          fontWeight: 500,
          cursor: loading ? "not-allowed" : "pointer",
          letterSpacing: "-0.01em",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        {loading ? (
          <>
            <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
            Processing payment…
          </>
        ) : (
          "Subscribe — $20/month"
        )}
      </button>

      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        fontSize: "11px",
        color: "#444444",
      }}>
        <Lock size={10} />
        <span>Secured by Stripe. Cancel anytime.</span>
      </div>
    </form>
  );
}

export function SubscribeContent() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0A0A0A",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
    }}>
      <div style={{
        maxWidth: "420px",
        width: "100%",
        background: "#111111",
        border: "0.5px solid #1E1E1E",
        borderRadius: "16px",
        padding: "2.25rem 2rem",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "2rem" }}>
          <svg width="32" height="32" viewBox="0 0 56 56" fill="none">
            <rect width="56" height="56" rx="13" fill="#FF4D00" />
            <line x1="15" y1="40" x2="23" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square" />
            <line x1="24" y1="40" x2="32" y2="12" stroke="white" strokeWidth="4.5" strokeLinecap="square" />
            <line x1="33" y1="40" x2="41" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square" />
          </svg>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 500, letterSpacing: "-0.025em", lineHeight: 1, color: "#F0EEE8" }}>
              Open<span style={{ color: "#FF4D00" }}>Claw</span>
            </div>
            <div style={{ fontSize: "8px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#444444", marginTop: "3px" }}>
              Pro
            </div>
          </div>
        </div>

        <h1 style={{
          fontSize: "clamp(1.5rem, 3vw, 1.9rem)",
          fontWeight: 500,
          letterSpacing: "-0.03em",
          color: "#F0EEE8",
          marginBottom: "6px",
          lineHeight: 1.1,
        }}>
          Subscribe to get started
        </h1>
        <p style={{ fontSize: "13px", color: "#555555", lineHeight: 1.6, marginBottom: "1.5rem" }}>
          Access all features with a simple monthly plan.
        </p>

        {/* Price & Features */}
        <div style={{
          background: "#0A0A0A",
          border: "0.5px solid #1E1E1E",
          borderRadius: "12px",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "1rem" }}>
            <span style={{ fontSize: "36px", fontWeight: 600, color: "#F0EEE8", letterSpacing: "-0.03em" }}>
              $20
            </span>
            <span style={{ fontSize: "14px", color: "#555555" }}>/month</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {FEATURES.map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Check size={14} style={{ color: "#FF4D00", flexShrink: 0 }} />
                <span style={{ fontSize: "13px", color: "#999999" }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{
          height: "0.5px",
          background: "linear-gradient(90deg, transparent, #1E1E1E 20%, #1E1E1E 80%, transparent)",
          margin: "0 0 1.5rem",
        }} />

        {/* Payment Form */}
        <Elements stripe={getStripe()}>
          <PaymentForm />
        </Elements>

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
