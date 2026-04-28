import type { ReactNode } from "react";
import { X } from "lucide-react";

type Props = {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: number;
};

export function ModalShell({ title, subtitle, onClose, children, maxWidth = 560 }: Props) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(28,22,18,0.4)", backdropFilter: "blur(2px)" }} />
      <div
        style={{
          position: "relative",
          background: "#fff",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "1.5rem",
          width: "100%",
          maxWidth,
          maxHeight: "90vh",
          overflowY: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          boxShadow: "0 8px 40px rgba(28,22,18,0.12)",
          transform: "translateZ(0)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--foreground)", margin: "0 0 4px" }}>{title}</h2>
            {subtitle && <p style={{ fontSize: 13, color: "var(--foreground-3)", margin: 0 }}>{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "var(--foreground-3)", cursor: "pointer", padding: 4, display: "flex" }}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
