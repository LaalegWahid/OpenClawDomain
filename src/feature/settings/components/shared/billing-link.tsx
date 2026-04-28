import { ChevronRight, CreditCard } from "lucide-react";
import Link from "next/link";
import { ACCENT, mono, serif } from "./constants";

export function BillingLink() {
  return (
    <Link href="/settings/billing" style={{ textDecoration: "none" }}>
      <div
        style={{
          background: "#fff",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: "1.5rem 1.75rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          transition: "border-color 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = ACCENT)}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,77,0,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CreditCard size={17} style={{ color: ACCENT }} />
          </div>
          <div>
            <div style={{ fontFamily: serif, fontSize: 17, fontWeight: 600, color: "var(--foreground)", marginBottom: 3 }}>Billing</div>
            <div style={{ fontFamily: mono, fontSize: 11, color: "var(--foreground-3)", letterSpacing: "0.02em" }}>
              Manage your subscription, payment methods, and invoices.
            </div>
          </div>
        </div>
        <ChevronRight size={16} style={{ color: "var(--foreground-3)", flexShrink: 0 }} />
      </div>
    </Link>
  );
}
