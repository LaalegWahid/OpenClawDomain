import type { ReactNode } from "react";
import { BORDER, DANGER, MUTED } from "./constants";

type Props = {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  danger?: boolean;
  children: ReactNode;
};

export function IconAction({ onClick, disabled, title, danger, children }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        background: "transparent",
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
        padding: "6px 8px",
        cursor: disabled ? "not-allowed" : "pointer",
        color: danger ? DANGER : MUTED,
        opacity: disabled ? 0.5 : 1,
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {children}
    </button>
  );
}
