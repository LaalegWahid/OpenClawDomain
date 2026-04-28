import type { ReactNode } from "react";
import { mono, serif } from "./constants";

export function StatCard({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "1.25rem 1.5rem",
      flex: "1 1 200px",
      minWidth: 180,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        {icon}
        <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--foreground-3)" }}>
          {label}
        </span>
      </div>
      <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 600, color: "var(--foreground)", lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: mono, fontSize: 11, color: "var(--foreground-3)", marginTop: 4 }}>
          {sub}
        </div>
      )}
    </div>
  );
}
