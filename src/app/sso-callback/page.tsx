"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallbackPage() {
  return (
    <>
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl="/auth/bridge"
        signUpForceRedirectUrl="/auth/bridge"
      />
      <div id="clerk-captcha" />
    </>
  );
}