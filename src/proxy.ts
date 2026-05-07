import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "./shared/lib/auth/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/login",
  "/register",
  "/subscribe",
  "/docs",
  "/about",
  "/pricing",
  "/contact",
  "/terms",
  "/privacy",
  "/sso-callback(.*)",
  "/auth/bridge(.*)",
  "/api/auth(.*)",
  "/api/debug(.*)",
  "/chat(.*)",
  "/monitor(.*)",
  "/overview(.*)",
  "/billing(.*)",
  "/settings(.*)",
  "/skills(.*)",
]);

export default clerkMiddleware(async (_clerkAuth, req: NextRequest) => {
  const path = req.nextUrl.pathname;
  const cookieNames = req.cookies.getAll().map(c => c.name);
  // console.log(`[proxy] → ${req.method} ${path} cookies=${JSON.stringify(cookieNames)}`);

  if (isPublicRoute(req)) {
    // console.log(`[proxy] ← ${path} PUBLIC`);
    return NextResponse.next();
  }

  const session = req.cookies.get("better-auth.session_token")
    ?? req.cookies.get("__Secure-better-auth.session_token");

  if (session) {
    // console.log(`[proxy] ← ${path} BETTER-AUTH SESSION`);
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("callbackUrl", path);
  // console.log(`[proxy] ← ${path} NO SESSION → /login`);
  return NextResponse.redirect(loginUrl);
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)" ],
};