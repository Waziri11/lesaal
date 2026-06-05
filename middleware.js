import { NextResponse } from "next/server";
import { CSRF_COOKIE_NAME, generateCsrfToken, isLikelyValidCsrfToken } from "./lib/csrf";
import { SESSION_COOKIE_NAME } from "./lib/constants";
import { applySecurityHeaders } from "./lib/security-headers";
import { getSecurityConfig } from "./lib/security-config";

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const isAdminPath = pathname.startsWith("/admin");
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value || "";
  let response = null;

  if (isAdminPath) {
    if (pathname === "/admin/login") {
      response = NextResponse.next();
    } else if (!sessionToken) {
      response = NextResponse.redirect(new URL("/admin/login", request.url));
    } else {
      response = NextResponse.next();
    }
  }

  if (!response) {
    response = NextResponse.next();
  }

  // Ensure required security environment variables exist in all environments.
  getSecurityConfig();

  const csrfToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;

  if (!isLikelyValidCsrfToken(csrfToken)) {
    response.cookies.set({
      name: CSRF_COOKIE_NAME,
      value: generateCsrfToken(),
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
  }

  applySecurityHeaders(response.headers);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
