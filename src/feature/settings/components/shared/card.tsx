import type { ReactNode } from "react";
import { mono, serif } from "./constants";
import { SaveButton } from "./save-button";

type Props = {
  title: string;
  desc: string;
  children: ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  saved: boolean;
};

export function Card({ title, desc, children, onSubmit, saved }: Props) {
  return (
    <form onSubmit={onSubmit} style={{
      background: "#fff",
      border: "1px solid var(--border)",
      borderRadius: 14,
      padding: "1.75rem",
      display: "flex",
      flexDirection: "column",
      gap: "1.25rem",
    }}>
      <div>
        <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 600, color: "var(--foreground)", marginBottom: 4 }}>{title}</div>
        <div style={{ fontFamily: mono, fontSize: 12, color: "var(--foreground-3)", lineHeight: 1.6, letterSpacing: "0.02em" }}>{desc}</div>
      </div>

      <div style={{ height: 1, background: "var(--border)" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {children}
      </div>

      <SaveButton saved={saved} />
    </form>
  );
}
