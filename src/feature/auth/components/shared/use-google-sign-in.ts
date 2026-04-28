"use client";

import { useAuth, useClerk, useSignIn } from "@clerk/nextjs";

export function useGoogleSignIn(setError: (message: string | null) => void) {
  const { signIn: clerkSignIn, fetchStatus } = useSignIn();
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();

  async function handleGoogleLogin() {
    setError(null);

    if (!clerkSignIn) {
      const hasKey = typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "string"
        && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.length > 0;
      setError(
        hasKey
          ? "Sign-in is still loading. Please wait a second and try again."
          : "Google sign-in is unavailable: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY was not set when the app was built.",
      );
      return;
    }

    try {
      if (isSignedIn) {
        await signOut();
      }
      const { error: ssoErr } = await clerkSignIn.sso({
        strategy: "oauth_google",
        redirectCallbackUrl: "/sso-callback",
        redirectUrl: "/auth/bridge",
      });
      if (ssoErr) {
        console.error("Clerk SSO error:", ssoErr);
        setError(ssoErr.message ?? "Google sign-in failed.");
      }
    } catch (err) {
      console.error("Google sign-in threw:", err);
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
    }
  }

  return { handleGoogleLogin, fetchStatus };
}
