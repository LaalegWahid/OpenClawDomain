import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/shared/lib/auth/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  const isAuthenticated = session?.user;
  const isAdmin = session?.user?.role === "admin";

  const publicRoutes = [
    "/",
    "/login",
    "/register",
    "/about",
    "/pricing",
    "/contact",
    "/terms",
    "/privacy",
    // Add any other public/marketing pages
  ];

  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));


  if ((pathname === "/login" || pathname === "/register") && isAuthenticated) {
    return NextResponse.redirect(new URL("/overview", request.url));
  }

  if (pathname.startsWith("/admin") && !isAdmin) {
    const callbackUrl = encodeURIComponent(pathname);
    return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, request.url));
  }
  
  if (!isPublicRoute && !isAuthenticated) {
    const callbackUrl = encodeURIComponent(pathname);
    return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};