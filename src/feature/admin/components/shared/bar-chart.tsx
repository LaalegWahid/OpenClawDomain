import { MUTED } from "./constants";
import { formatDay } from "./format";
import type { SeriesPoint } from "./types";

export function BarChart({ data, color }: { data: SeriesPoint[]; color: string }) {
  const W = 600;
  const H = 140;
  const PAD = 8;
  if (data.length === 0) {
    return <div style={{ padding: "30px 0", textAlign: "center", color: MUTED, fontSize: 13 }}>No data</div>;
  }
  const max = Math.max(1, ...data.map((d) => d.count));
  const bw = (W - PAD * 2) / data.length;
  return (
    <div style={{ width: "100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
        {data.map((d, i) => {
          const h = (d.count / max) * (H - PAD * 2);
          const x = PAD + i * bw + bw * 0.15;
          const y = H - PAD - h;
          return (
            <rect
              key={d.day}
              x={x}
              y={y}
              width={bw * 0.7}
              height={Math.max(h, d.count > 0 ? 1 : 0)}
              fill={color}
              opacity={0.85}
              rx={1.5}
            />
          );
        })}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: MUTED, marginTop: 4 }}>
        <span>{formatDay(data[0].day)}</span>
        <span>{formatDay(data[data.length - 1].day)}</span>
      </div>
    </div>
  );
}
