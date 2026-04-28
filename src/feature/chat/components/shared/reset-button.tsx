import { RotateCcw } from "lucide-react";
import { mono } from "./constants";

export function ResetButton({ onClick, compact = false }: { onClick: () => void; compact?: boolean }) {
  return (
    <button
      onClick={onClick}
      title="Clear conversation"
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: compact ? "7px 12px" : "9px 14px",
        border: "1px solid var(--border)", borderRadius: 8,
        background: "var(--surface)", cursor: "pointer",
        fontFamily: mono,
        fontSize: compact ? 10 : 11,
        fontWeight: 500,
        letterSpacing: "0.04em", textTransform: "uppercase",
        color: "var(--foreground-2)", transition: "border-color 0.15s",
        flexShrink: 0,
      }}
    >
      <RotateCcw size={compact ? 11 : 12} />
      Reset
    </button>
  );
}
