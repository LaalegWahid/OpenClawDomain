import { MUTED } from "./constants";
import { formatDay } from "./format";
import type { SeriesPoint } from "./types";

export function LineChart({ data, color, fill }: { data: SeriesPoint[]; color: string; fill: string }) {
  const W = 600;
  const H = 140;
  const PAD = 8;
  if (data.length === 0) {
    return <div style={{ padding: "30px 0", textAlign: "center", color: MUTED, fontSize: 13 }}>No data</div>;
  }
  const max = Math.max(1, ...data.map((d) => d.count));
  const step = data.length > 1 ? (W - PAD * 2) / (data.length - 1) : 0;
  const points = data.map((d, i) => {
    const x = PAD + i * step;
    const y = H - PAD - (d.count / max) * (H - PAD * 2);
    return { x, y, d };
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${path} L${points[points.length - 1].x.toFixed(1)},${H - PAD} L${points[0].x.toFixed(1)},${H - PAD} Z`;
  return (
    <div style={{ width: "100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
        <path d={area} fill={fill} />
        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p) =>
          p.d.count > 0 ? <circle key={p.d.day} cx={p.x} cy={p.y} r={2.5} fill={color} /> : null,
        )}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: MUTED, marginTop: 4 }}>
        <span>{formatDay(data[0].day)}</span>
        <span>{formatDay(data[data.length - 1].day)}</span>
      </div>
    </div>
  );
}
