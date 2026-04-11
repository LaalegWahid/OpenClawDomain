"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768); }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    document.body.style.overflow = navOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [navOpen]);

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
  }

  function isActive(href: string) {
    if (href === "/overview") return pathname === "/overview" || pathname.startsWith("/overview/");
    return pathname === href;
  }

  const NAVBAR_H = 60;

  const linkStyle = (active: boolean): React.CSSProperties => ({
    fontSize: "13px",
    color: active ? "#FF4D00" : "#8a7060",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    textDecoration: "none",
    transition: "color 0.2s",
    fontWeight: active ? 500 : 400,
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <nav style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        zIndex: 100,
        background: "rgba(248,242,237,0.92)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: "0.5px solid rgba(42,31,25,0.1)",
      }}>
        <div style={{
          height: `${NAVBAR_H}px`,
          padding: "0 1.75rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          {/* Logo */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "9px", textDecoration: "none", flexShrink: 0 }}>
            <svg width="32" height="32" viewBox="0 0 56 56" fill="none">
              <rect width="56" height="56" rx="13" fill="#FF4D00" />
              <line x1="15" y1="40" x2="23" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square" />
              <line x1="24" y1="40" x2="32" y2="12" stroke="white" strokeWidth="4.5" strokeLinecap="square" />
              <line x1="33" y1="40" x2="41" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square" />
            </svg>
            <span style={{ fontSize: "14px", fontWeight: 500, letterSpacing: "-0.025em", color: "#2a1f19" }}>
              <span style={{ color: "#FF4D00" }}>01.</span>OpenClaw
            </span>
          </Link>

          {/* Desktop nav links */}
          {!isMobile && (
            <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
              {NAV.map(item => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={linkStyle(active)}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "#2a1f19"; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "#8a7060"; }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Right side */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
            {!isMobile && (
              <button
                onClick={handleSignOut}
                style={{
                  fontSize: "13px", color: "#8a7060", background: "none",
                  border: "none", cursor: "pointer", padding: 0,
                  transition: "color 0.2s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#2a1f19"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#8a7060"; }}
              >
                Sign out
              </button>
            )}
            {isMobile && (
              <button
                onClick={() => setNavOpen(o => !o)}
                aria-label="Toggle menu"
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  padding: "8px", display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#2a1f19", width: "36px", height: "36px",
                }}
              >
                {navOpen ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <line x1="4" y1="4" x2="16" y2="16" stroke="#2a1f19" strokeWidth="2" strokeLinecap="round" />
                    <line x1="16" y1="4" x2="4" y2="16" stroke="#2a1f19" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <line x1="2" y1="5" x2="18" y2="5" stroke="#2a1f19" strokeWidth="2" strokeLinecap="round" />
                    <line x1="2" y1="10" x2="18" y2="10" stroke="#2a1f19" strokeWidth="2" strokeLinecap="round" />
                    <line x1="2" y1="15" x2="18" y2="15" stroke="#2a1f19" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Mobile overlay ────────────────────────────────────── */}
      {isMobile && navOpen && (
        <div
          style={{
            position: "fixed", top: `${NAVBAR_H}px`, left: 0, right: 0, bottom: 0,
            zIndex: 99, background: "rgba(248,242,237,0.98)", backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: "1.5rem",
            overflowY: "auto",
          }}
          onClick={e => { if (e.target === e.currentTarget) setNavOpen(false); }}
        >
          {NAV.map(item => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setNavOpen(false)}
                style={{
                  fontSize: "1.4rem", color: active ? "#FF4D00" : "#2a1f19",
                  background: "none", border: "none", textDecoration: "none",
                  fontWeight: active ? 500 : 400, letterSpacing: "-0.02em",
                  padding: "8px 0", transition: "color 0.2s",
                }}
              >
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={() => { setNavOpen(false); handleSignOut(); }}
            style={{
              marginTop: "1rem", background: "none", color: "#8a7060",
              border: "0.5px solid rgba(42,31,25,0.15)", padding: "14px 32px", borderRadius: "10px",
              fontSize: "15px", fontWeight: 400, cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>
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
    </div>
  );
}
