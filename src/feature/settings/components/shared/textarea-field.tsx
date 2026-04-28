"use client";

import { useState } from "react";
import { ACCENT, mono } from "./constants";

type Props = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
};

export function TextareaField({ label, value, onChange, placeholder, rows = 4 }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontFamily: mono, fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", color: "var(--foreground-2)", textTransform: "uppercase" }}>
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          background: "var(--surface-2)",
          border: `1px solid ${focused ? ACCENT : "var(--border)"}`,
          borderRadius: 8,
          padding: "11px 14px",
          fontSize: 13,
          fontFamily: mono,
          color: "var(--foreground)",
          outline: "none",
          width: "100%",
          resize: "none",
          transition: "border-color 0.15s",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}
