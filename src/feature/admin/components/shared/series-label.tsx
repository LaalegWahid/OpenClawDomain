import { INK, MUTED } from "./constants";

export function SeriesLabel({ total, suffix }: { total: number; suffix: string }) {
  return (
    <div style={{ fontSize: 12, color: MUTED }}>
      <span style={{ fontWeight: 700, color: INK, fontFamily: "var(--serif)", fontSize: 16 }}>{total}</span>{" "}
      {suffix}
    </div>
  );
}
