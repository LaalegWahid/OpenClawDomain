import Link from "next/link";
import { ACCENT, serif } from "./constants";

export function AuthLogo({ marginBottom = "2rem" }: { marginBottom?: string }) {
  return (
    <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "10px", textDecoration: "none", marginBottom }}>
      <svg width="30" height="30" viewBox="0 0 56 56" fill="none">
        <rect width="56" height="56" rx="13" fill={ACCENT} />
        <line x1="15" y1="40" x2="23" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square" />
        <line x1="24" y1="40" x2="32" y2="12" stroke="white" strokeWidth="4.5" strokeLinecap="square" />
        <line x1="33" y1="40" x2="41" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square" />
      </svg>
      <span style={{ fontFamily: serif, fontSize: "20px", fontWeight: 600, letterSpacing: "-0.01em", color: "var(--foreground)", lineHeight: 1 }}>
        Open<span style={{ color: ACCENT }}>Claw</span>
      </span>
    </Link>
  );
}
