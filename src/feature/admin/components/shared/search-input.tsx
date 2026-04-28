import { Search } from "lucide-react";
import { BORDER, INK, MUTED } from "./constants";

export function SearchInput({
  value,
  onChange,
  placeholder,
  width = 200,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  width?: number;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "rgba(42,31,25,0.04)",
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        padding: "6px 10px",
      }}
    >
      <Search size={13} color={MUTED} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          background: "transparent",
          border: "none",
          outline: "none",
          fontSize: 12,
          color: INK,
          width,
        }}
      />
    </div>
  );
}
