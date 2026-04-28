import type { ReactNode } from "react";
import { BORDER, CARD, INK } from "./constants";

export function Card({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className="oc-page-section oc-card"
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: 18,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: INK }}>
          {icon}
          <h3 style={{ fontFamily: "var(--serif)", fontSize: 16, margin: 0, fontWeight: 600 }}>
            <em>{title}</em>
          </h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
