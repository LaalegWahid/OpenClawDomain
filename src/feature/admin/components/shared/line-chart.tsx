"use client";

import { useEffect, useRef, useState } from "react";
import { BORDER, MUTED } from "./constants";
import { formatDay } from "./format";
import type { SeriesPoint } from "./types";

export function LineChart({
  data,
  color,
  fill,
  showAxis = false,
  showGrid = false,
  height = 140,
  xLabelCount = 2,
  highlightPeak = false,
}: {
  data: SeriesPoint[];
  color: string;
  fill: string;
  showAxis?: boolean;
  showGrid?: boolean;
  height?: number;
  xLabelCount?: number;
  highlightPeak?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const Y_AXIS_W = 36;

  if (data.length === 0) {
    return <div style={{ padding: "30px 0", textAlign: "center", color: MUTED, fontSize: 13 }}>No data</div>;
  }

  const W = Math.max(1, width);
  const H = height;
  const PAD_X = 8;
  const PAD_Y = 12;

  const max = Math.max(1, ...data.map((d) => d.count));
  const step = data.length > 1 ? (W - PAD_X * 2) / (data.length - 1) : 0;
  const points = data.map((d, i) => {
    const x = PAD_X + i * step;
    const y = H - PAD_Y - (d.count / max) * (H - PAD_Y * 2);
    return { x, y, d };
  });
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const area = `${path} L${points[points.length - 1].x.toFixed(1)},${H - PAD_Y} L${points[0].x.toFixed(1)},${H - PAD_Y} Z`;

  const peakIdx = highlightPeak
    ? data.reduce((acc, d, i) => (d.count > data[acc].count ? i : acc), 0)
    : -1;

  const gridFractions = showGrid ? [0.25, 0.5, 0.75] : [];

  const tickCount = Math.max(2, Math.min(xLabelCount, data.length));
  const xLabels = Array.from({ length: tickCount }, (_, i) => {
    const idx = Math.round((i / (tickCount - 1)) * (data.length - 1));
    return data[idx];
  });

  return (
    <div style={{ width: "100%", display: "flex", alignItems: "flex-start" }}>
      {showAxis && (
        <div
          style={{
            width: Y_AXIS_W,
            height: H,
            position: "relative",
            fontSize: 10,
            color: MUTED,
            flexShrink: 0,
          }}
        >
          <span style={{ position: "absolute", top: 0, right: 6, lineHeight: 1 }}>{max}</span>
          <span style={{ position: "absolute", top: "50%", right: 6, lineHeight: 1, transform: "translateY(-50%)" }}>
            {Math.round(max / 2)}
          </span>
          <span style={{ position: "absolute", bottom: 0, right: 6, lineHeight: 1 }}>0</span>
        </div>
      )}
      <div ref={ref} style={{ flex: 1, minWidth: 0 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
          {gridFractions.map((g) => {
            const y = PAD_Y + g * (H - PAD_Y * 2);
            return (
              <line
                key={g}
                x1={PAD_X}
                x2={W - PAD_X}
                y1={y}
                y2={y}
                stroke={BORDER}
                strokeWidth={1}
                strokeDasharray="3 4"
              />
            );
          })}
          <path d={area} fill={fill} />
          <path
            d={path}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((p, i) =>
            p.d.count > 0 ? (
              <circle
                key={p.d.day}
                cx={p.x}
                cy={p.y}
                r={i === peakIdx ? 4 : 2.5}
                fill={color}
                stroke={i === peakIdx ? "#fff" : undefined}
                strokeWidth={i === peakIdx ? 1.5 : 0}
              />
            ) : null,
          )}
        </svg>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            color: MUTED,
            marginTop: 6,
          }}
        >
          {xLabels.map((d, i) => (
            <span key={`${d.day}-${i}`}>{formatDay(d.day)}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
