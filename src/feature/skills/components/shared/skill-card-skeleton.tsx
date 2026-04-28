import { skeleton } from "./constants";

export function SkillCardSkeleton() {
  return (
    <div style={{ background: "#ffffff", border: "1px solid var(--border)", borderRadius: "16px", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, ...skeleton }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", ...skeleton }} />
          <div style={{ width: 44, height: 10, ...skeleton }} />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ width: "70%", height: 15, ...skeleton }} />
        <div style={{ width: "45%", height: 11, ...skeleton }} />
        <div style={{ width: 52, height: 18, borderRadius: 4, marginTop: 2, ...skeleton }} />
      </div>
    </div>
  );
}
