import { ACCENT, mono } from "./constants";

const STEPS = [
  { n: 1, label: "Agent Info" },
  { n: 2, label: "AI Provider" },
  { n: 3, label: "Platform" },
] as const;

export function StepIndicator({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  return (
    <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
      {STEPS.map((s, i) => {
        const active = currentStep === s.n;
        const done = currentStep > s.n;
        return (
          <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 8, flex: i === 2 ? "0 0 auto" : 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: active || done ? 1 : 0.5 }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: active || done ? ACCENT : "var(--surface-2)",
                color: active || done ? "#fff" : "var(--foreground-3)",
                fontFamily: mono, fontSize: 11, fontWeight: 600,
                border: active || done ? "none" : "1px solid var(--border)",
                flexShrink: 0,
              }}>
                {s.n}
              </div>
              <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", color: active ? "var(--foreground)" : "var(--foreground-3)" }}>
                {s.label}
              </span>
            </div>
            {i < 2 && <div style={{ flex: 1, height: 1, background: done ? ACCENT : "var(--border)" }} />}
          </div>
        );
      })}
    </div>
  );
}
