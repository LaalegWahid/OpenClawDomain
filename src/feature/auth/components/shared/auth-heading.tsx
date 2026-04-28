import { mono, serif } from "./constants";

export function AuthHeading({ title, subtitle, marginBottom = "2rem" }: { title: string; subtitle: string; marginBottom?: string }) {
  return (
    <div style={{ marginBottom }}>
      <h1 style={{ fontFamily: serif, fontSize: "clamp(1.6rem, 3vw, 2rem)", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--foreground)", margin: "0 0 6px", lineHeight: 1.1 }}>
        {title}
      </h1>
      <p style={{ fontFamily: mono, fontSize: "12px", color: "var(--foreground-3)", lineHeight: 1.6, letterSpacing: "0.02em", margin: 0 }}>
        {subtitle}
      </p>
    </div>
  );
}
