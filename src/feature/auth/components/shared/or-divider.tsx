import { mono } from "./constants";

export function OrDivider({ label = "or continue with", margin = "1.75rem 0 1.25rem" }: { label?: string; margin?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin }}>
      <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
      <span style={{ fontFamily: mono, fontSize: 11, color: "var(--foreground-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </span>
      <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
    </div>
  );
}
