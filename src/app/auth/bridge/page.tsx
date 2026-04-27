"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useClerk } from "@clerk/nextjs";

export default function BridgePage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { signOut } = useClerk();
  const ran = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || ran.current) return;
    ran.current = true;

    (async () => {
      const token = await getToken();
      console.log("[bridge] got clerk token?", !!token);
      if (!token) {
        setError("no_clerk_token");
        return;
      }
      const res = await fetch("/api/auth/clerk-bridge", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      console.log("[bridge] response", res.status, body);
      console.log("[bridge] cookies after fetch:", document.cookie);
      if (!res.ok) {
        setError(body.error ?? `bridge_failed_${res.status}`);
        return;
      }
      // Drop Clerk's session — better-auth is the only source of truth from here.
      await signOut({ redirectUrl: undefined as unknown as string });
      console.log("[bridge] signed out of clerk, navigating to /overview");
      router.replace("/overview");
    })();
  }, [isLoaded, isSignedIn, getToken, signOut, router]);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0a0a0f", color: "#f1f5f9", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        {error ? (
          <>
            <p style={{ color: "#fca5a5" }}>Sign-in failed: {error}</p>
            <a href="/login" style={{ color: "#818cf8" }}>Back to login</a>
          </>
        ) : (
          <p>Finishing sign-in…</p>
        )}
      </div>
    </main>
  );
}
