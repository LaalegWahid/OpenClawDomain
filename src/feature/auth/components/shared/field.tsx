"use client";

import { useState } from "react";
import { ACCENT, mono } from "./constants";

type FieldProps = {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete?: string;
};

export function Field({
  id, label, type, value, onChange, placeholder, autoComplete,
}: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label htmlFor={id} style={{ fontFamily: mono, fontSize: "11px", fontWeight: 500, letterSpacing: "0.08em", color: "var(--foreground-2)", textTransform: "uppercase" }}>
        {label}
      </label>
      <input
        id={id} type={type} autoComplete={autoComplete} required
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          background: "var(--surface-2)",
          border: `1px solid ${focused ? ACCENT : "var(--border)"}`,
          borderRadius: "8px", padding: "11px 14px",
          fontFamily: mono, fontSize: "13px", color: "var(--foreground)",
          outline: "none", width: "100%", transition: "border-color 0.15s",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}
