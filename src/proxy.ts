import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/shared/lib/auth/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  const isAuthenticated = session?.user;

  const publicRoutes = [
    "/",
    "/login",
    "/register",
    "/subscribe",
    "/about",
    "/pricing",
    "/contact",
    "/terms",
    "/privacy",
  ];

  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  if ((pathname === "/login" || pathname === "/register") && isAuthenticated) {
    return NextResponse.redirect(new URL("/overview", request.url));
  }

  if (pathname.startsWith("/admin") && session?.user?.role !== "admin") {
    const callbackUrl = encodeURIComponent(pathname);
    return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, request.url));
  }

  if (!isPublicRoute && !isAuthenticated) {
    const callbackUrl = encodeURIComponent(pathname);
    return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, request.url));
  }

  // Subscription guard: authenticated non-public routes require active subscription
  if (isAuthenticated && !isPublicRoute) {
    try {
      const subUrl = new URL("/api/stripe/subscription", request.url);
      const res = await fetch(subUrl.toString(), {
        headers: { cookie: request.headers.get("cookie") ?? "" },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status !== "active") {
          return NextResponse.redirect(new URL("/subscribe", request.url));
        }
      }
    } catch {
      // If subscription check fails, allow through to avoid locking users out
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
