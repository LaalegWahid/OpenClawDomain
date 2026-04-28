import { SOURCE_STYLES, mono } from "./constants";

export function SourceBadge({ source }: { source: string }) {
  const s = SOURCE_STYLES[source] ?? { bg: "rgba(0,0,0,0.06)", color: "var(--foreground-2)", label: source };
  return (
    <span style={{
      fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
      background: s.bg, color: s.color,
      padding: "3px 8px", borderRadius: 4,
    }}>
      {s.label}
    </span>
  );
}
