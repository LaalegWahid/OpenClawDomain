import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "./shared/lib/auth/server";
import { isSubscriptionActive } from "./shared/lib/subscription/cache";

const PUBLIC_ROUTES = [
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
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const session = await auth.api.getSession({ headers: request.headers });
  const isAuthenticated = session?.user;
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || (route !== "/" && pathname.startsWith(route + "/")),
  );

  if ((pathname === "/login" || pathname === "/register") && isAuthenticated) {
    return NextResponse.redirect(new URL("/overview", request.url));
  }

  if (pathname.startsWith("/admin") && session?.user?.role !== "admin") {
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${encodeURIComponent(pathname)}`, request.url)
    );
  }

  if (!isPublicRoute && !isAuthenticated) {
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${encodeURIComponent(pathname)}`, request.url)
    );
  }

  if (isAuthenticated && !isPublicRoute) {
    try {
      const active = await isSubscriptionActive(session.user.id);
      if (!active) {
        return NextResponse.redirect(new URL("/subscribe", request.url));
      }
    } catch {
      // Redis/DB down — let through rather than lock users out
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)" ],
};