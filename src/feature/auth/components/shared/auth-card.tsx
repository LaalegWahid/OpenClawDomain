import type { ReactNode } from "react";

export function AuthCard({ children, padding = "2.5rem 2.25rem" }: { children: ReactNode; padding?: string }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", padding, boxShadow: "0 4px 24px rgba(42,31,25,0.07)" }}>
      {children}
    </div>
  );
}
