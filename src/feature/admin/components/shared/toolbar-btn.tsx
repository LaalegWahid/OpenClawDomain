import type { ReactNode } from "react";
import { ACCENT, BORDER, INK } from "./constants";

type Props = {
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  title?: string;
  active?: boolean;
};

export function ToolbarBtn({ onClick, children, disabled, title, active }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: active ? "rgba(255,77,0,0.12)" : "transparent",
        border: `1px solid ${active ? ACCENT : BORDER}`,
        borderRadius: 8,
        padding: "6px 10px",
        fontSize: 12,
        fontWeight: 600,
        color: active ? ACCENT : INK,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}
