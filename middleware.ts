import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/token";
import { ROLE_HOME, roleForPath } from "@/lib/roles";

/**
 * First line of defence for role areas. It only verifies the token signature and role; it cannot
 * check the database. Server layouts, pages and API routes ALWAYS re-check with the database
 * (see lib/auth/guards.ts) - never rely on middleware alone.
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const requiredRole = roleForPath(pathname);
  if (!requiredRole) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }
  if (session.role !== requiredRole) {
    return NextResponse.redirect(new URL(ROLE_HOME[session.role], request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/customer/:path*", "/supplier/:path*", "/admin/:path*"],
};
