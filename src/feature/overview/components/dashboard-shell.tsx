"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { authClient } from "../../../shared/lib/auth/client";

const NAV = [
  { label: "Agents",  href: "/overview" },
  { label: "Monitor", href: "/monitor"  },
  { label: "Skills",  href: "/skills"   },
  { label: "Profile", href: "/settings" },
];

interface DashboardShellProps {
  children: React.ReactNode;
  userEmail?: string | null;
  userName?: string | null;
  pageTitle: string;
  isAdmin?: boolean;
}

export function DashboardShell({ children, userEmail, userName }: DashboardShellProps) {
  const pathname     = usePathname();
  const router       = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initial = (userName?.[0] ?? userEmail?.[0] ?? "U").toUpperCase();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
  }

  function isActive(href: string) {
    if (href === "/overview") return pathname === "/overview" || pathname.startsWith("/overview/");
    return pathname === href;
  }

  const NAVBAR_H = 60;
  const serif = "var(--serif), 'Cormorant Garamond', Georgia, serif";
  const mono  = "var(--mono), 'JetBrains Mono', monospace";

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <header style={{
        position:     "fixed",
        top:          0, left: 0, right: 0,
        height:       `${NAVBAR_H}px`,
        background:   "#fff",
        borderBottom: "1px solid var(--border)",
        display:      "flex",
        alignItems:   "center",
        padding:      "0 2rem",
        zIndex:       100,
        gap:          "0",
      }}>

        {/* Logo */}
        <Link href="/" style={{
          display: "inline-flex", alignItems: "center", gap: "10px",
          textDecoration: "none", flexShrink: 0, marginRight: "2.5rem",
        }}>
          <svg width="28" height="28" viewBox="0 0 56 56" fill="none">
            <rect width="56" height="56" rx="13" fill="#FF4D00"/>
            <line x1="15" y1="40" x2="23" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square"/>
            <line x1="24" y1="40" x2="32" y2="12" stroke="white" strokeWidth="4.5" strokeLinecap="square"/>
            <line x1="33" y1="40" x2="41" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square"/>
          </svg>
          <span style={{
            fontFamily:    serif,
            fontSize:      "20px",
            fontWeight:    600,
            letterSpacing: "-0.01em",
            color:         "var(--foreground)",
            lineHeight:    1,
          }}>
            Open<span style={{ color: "#FF4D00" }}>Claw</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="nav-desktop" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2px", flex: 1 }}>
          {NAV.map(item => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href} style={{
                fontFamily:     mono,
                fontSize:       "11.5px",
                fontWeight:     active ? 600 : 400,
                letterSpacing:  "0.08em",
                textTransform:  "uppercase" as const,
                color:          active ? "#FF4D00" : "var(--foreground-2)",
                textDecoration: "none",
                padding:        "7px 14px",
                borderRadius:   "6px",
                background:     active ? "rgba(255,77,0,0.06)" : "transparent",
                borderBottom:   active ? "2px solid #FF4D00" : "2px solid transparent",
                transition:     "all 0.15s",
              }}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: user */}
        <div className="nav-desktop" style={{ display: "flex", alignItems: "center", gap: "12px", marginLeft: "auto", flexShrink: 0 }}>
          <button onClick={handleSignOut} style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "6px 12px",
            border: "1px solid var(--border)",
            borderRadius: "6px", background: "transparent",
            cursor: "pointer",
            fontFamily: mono, fontSize: "11px",
            letterSpacing: "0.06em", textTransform: "uppercase" as const,
            color: "var(--foreground-2)",
            transition: "border-color 0.15s, color 0.15s",
          }}>
            <LogOut size={12} />
            Sign out
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(o => !o)}
          className="nav-mobile-btn"
          style={{
            marginLeft: "auto", background: "transparent", border: "none",
            color: "var(--foreground-2)", cursor: "pointer",
            padding: "6px", display: "flex", alignItems: "center",
          }}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* ── Mobile drawer ─────────────────────────────────────── */}
      {mobileOpen && (
        <>
          <div onClick={() => setMobileOpen(false)} style={{
            position: "fixed", inset: 0,
            background: "rgba(28,22,18,0.3)",
            backdropFilter: "blur(2px)", zIndex: 98,
          }} />
          <div style={{
            position: "fixed", top: `${NAVBAR_H}px`, left: 0, right: 0,
            background: "#fff", borderBottom: "1px solid var(--border)",
            zIndex: 99, padding: "1rem 1.5rem 1.5rem",
          }}>
            <nav style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "1rem" }}>
              {NAV.map(item => {
                const active = isActive(item.href);
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} style={{
                    fontFamily: mono, fontSize: "12px", fontWeight: active ? 600 : 400,
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    color: active ? "#FF4D00" : "var(--foreground-2)",
                    textDecoration: "none", padding: "11px 12px", borderRadius: "8px",
                    background: active ? "rgba(255,77,0,0.06)" : "transparent",
                  }}>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
              <button onClick={handleSignOut} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", border: "1px solid var(--border)", borderRadius: "6px", background: "transparent", fontFamily: mono, fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--foreground-2)", cursor: "pointer" }}>
                <LogOut size={12} /> Sign out
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Page content ──────────────────────────────────────── */}
      <main style={{
        paddingTop:    `${NAVBAR_H + 40}px`,
        paddingLeft:   "2.5rem",
        paddingRight:  "2.5rem",
        paddingBottom: "3rem",
        width:         "100%",
        boxSizing:     "border-box",
      }}>
        {children}
      </main>

      <style>{`
        @media (max-width: 767px) {
          .nav-desktop { display: none !important; }
        }
        @media (min-width: 768px) {
          .nav-mobile-btn { display: none !important; }
        }
      `}</style>
    </div>
  );
}
