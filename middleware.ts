import { NextResponse, type NextRequest } from "next/server";
import { redirectWithCookies, updateSession } from "@/lib/supabase/middleware";
import { roleForPath } from "@/lib/roles";

/**
 * First line of defence: protected areas require a VERIFIED Supabase session (getUser()).
 * Middleware cannot query the database, so it does NOT decide roles. Role authorization happens in
 * every protected page and API route via lib/auth/guards.ts against the authoritative database
 * role. Never rely on middleware alone.
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const { response, user } = await updateSession(request);

  if (roleForPath(pathname) && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return redirectWithCookies(loginUrl, response);
  }
  return response ?? NextResponse.next();
}

export const config = {
  matcher: ["/customer/:path*", "/supplier/:path*", "/admin/:path*"],
};
