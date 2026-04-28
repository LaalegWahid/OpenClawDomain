import { STATUS_STYLES, mono } from "./constants";

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { bg: "rgba(0,0,0,0.06)", color: "var(--foreground-2)" };
  return (
    <span style={{
      fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
      background: s.bg, color: s.color,
      padding: "3px 8px", borderRadius: 4,
      display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      {status === "running" && (
        <span style={{
          width: 6, height: 6, borderRadius: "50%", background: s.color,
          animation: "pulse 1.5s infinite",
        }} />
      )}
      {status}
    </span>
  );
}
