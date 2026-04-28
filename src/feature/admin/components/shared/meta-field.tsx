import { INK, MUTED } from "./constants";

export function MetaField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: MUTED,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: mono ? "var(--mono), ui-monospace, monospace" : undefined,
          fontSize: 12,
          color: INK,
          wordBreak: "break-all",
        }}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}
