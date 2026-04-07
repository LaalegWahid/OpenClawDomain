"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Settings, LogOut, Menu, ShieldAlert, Sparkles } from "lucide-react";
import { authClient } from "../../../shared/lib/auth/client";

const NAV = [
  { label: "Dashboard", href: "/overview", icon: LayoutDashboard },
  { label: "Skills",    href: "/skills",   icon: Sparkles },
  { label: "Settings",  href: "/settings",  icon: Settings },
];

const ADMIN_NAV = { label: "Admin", href: "/admin", icon: ShieldAlert };

interface DashboardShellProps {
  children: React.ReactNode;
  userEmail?: string | null;
  userName?: string | null;
  pageTitle: string;
  isAdmin?: boolean;
}

export function DashboardShell({ children, userEmail, userName, pageTitle, isAdmin }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
useEffect(() => {
  if (!userName && !userEmail) {
    router.push("/login");
  }
}, [userName, userEmail, router]);
  useEffect(() => {
    function check() {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setOpen(!mobile);
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const initial = (userName?.[0] ?? userEmail?.[0] ?? "U").toUpperCase();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0A0A0A" }}>

      {/* ── Mobile backdrop ── */}
      {isMobile && open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(2px)",
            zIndex: 40,
          }}
        />
      )}

      {/* ── Sidebar ── */}
      <div style={{
        ...(isMobile ? {
          position: "fixed",
          top: 0,
          left: 0,
          width: open ? "100vw" : "0",
          height: "100vh",
          zIndex: 50,
        } : {
          width: open ? "220px" : "0",
          position: "sticky",
          top: 0,
          height: "100vh",
          flexShrink: 0,
        }),
        overflow: "hidden",
        transition: isMobile ? "width 0.25s ease" : "width 0.22s ease",
      }}>
        <aside style={{
          width: isMobile ? "100vw" : "220px",
          height: "100%",
          background: "#0D0D0D",
          borderRight: "0.5px solid #1E1E1E",
          display: "flex",
          flexDirection: "column",
        }}>
          {/* Logo / close button on mobile */}
          <div style={{ padding: "1.25rem 1rem 1rem", borderBottom: "0.5px solid #1E1E1E", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {isMobile && (
              <button
                onClick={() => setOpen(false)}
                style={{ background: "transparent", border: "none", color: "#555555", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" }}
              >
                <Menu size={17} />
              </button>
            )}
            <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "9px", textDecoration: "none" }}>
              <svg width="28" height="28" viewBox="0 0 56 56" fill="none">
                <rect width="56" height="56" rx="13" fill="#FF4D00"/>
                <line x1="15" y1="40" x2="23" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square"/>
                <line x1="24" y1="40" x2="32" y2="12" stroke="white" strokeWidth="4.5" strokeLinecap="square"/>
                <line x1="33" y1="40" x2="41" y2="14" stroke="white" strokeWidth="4.5" strokeLinecap="square"/>
              </svg>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 500, letterSpacing: "-0.025em", lineHeight: 1, color: "#F0EEE8", whiteSpace: "nowrap" }}>
                  Open<span style={{ color: "#FF4D00" }}>Claw</span>
                </div>
                <div style={{ fontSize: "7px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#444", marginTop: "3px" }}>
                  Manager
                </div>
              </div>
            </Link>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "0.75rem 0.75rem 0" }}>
            {[...NAV, ...(isAdmin ? [ADMIN_NAV] : [])].map(item => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} onClick={() => isMobile && setOpen(false)} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  marginBottom: "2px",
                  fontSize: "13px",
                  fontWeight: active ? 500 : 400,
                  color: active ? "#FF4D00" : "#555555",
                  background: active ? "rgba(255,77,0,0.08)" : "transparent",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  transition: "color 0.15s, background 0.15s",
                }}>
                  <Icon size={15} strokeWidth={active ? 2 : 1.5} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div style={{ padding: "0.75rem", borderTop: "0.5px solid #1E1E1E" }}>
            <button onClick={handleSignOut} style={{
              display: "flex", alignItems: "center", gap: "10px",
              width: "100%", padding: "8px 10px", borderRadius: "8px",
              border: "none", background: "transparent",
              fontSize: "13px", color: "#555555",
              cursor: "pointer", marginBottom: "10px",
              textAlign: "left", whiteSpace: "nowrap",
            }}>
              <LogOut size={14} />
              Sign out
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "0 2px" }}>
              <div style={{
                width: "28px", height: "28px", borderRadius: "50%",
                background: "#FF4D00", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "11px", fontWeight: 600, color: "#fff",
              }}>
                {initial}
              </div>
              <div style={{ minWidth: 0 }}>
                {userName && (
                  <div style={{ fontSize: "12px", fontWeight: 500, color: "#F0EEE8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {userName}
                  </div>
                )}
                <div style={{ fontSize: "11px", color: "#444", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {userEmail}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Top bar */}
        <header style={{
          height: "52px",
          borderBottom: "0.5px solid #1E1E1E",
          display: "flex",
          alignItems: "center",
          padding: "0 1.5rem",
          gap: "14px",
          position: "sticky",
          top: 0,
          background: "rgba(10,10,10,0.92)",
          backdropFilter: "blur(10px)",
          zIndex: 10,
        }}>
          <button
            onClick={() => setOpen(o => !o)}
            style={{
              background: "transparent", border: "none",
              color: open ? "#F0EEE8" : "#555555",
              cursor: "pointer", padding: "4px",
              display: "flex", alignItems: "center",
              transition: "color 0.15s",
              flexShrink: 0,
            }}
          >
            <Menu size={17} />
          </button>
          <span style={{ fontSize: "14px", fontWeight: 500, color: "#F0EEE8", letterSpacing: "-0.02em" }}>
            {pageTitle}
          </span>
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: "2rem 1.75rem", maxWidth: "900px", width: "100%" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
