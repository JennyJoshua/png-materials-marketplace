import { NextResponse, type NextRequest } from "next/server";
import { redirectWithCookies, updateSession } from "@/lib/supabase/middleware";
import { roleForPath } from "@/lib/roles";

const isPullRequestPreview = process.env.IS_PULL_REQUEST === "true";
const privateApiPrefixes = ["/api/providers", "/api/admin", "/api/customer", "/api/supplier"];
const authPagePrefixes = ["/login", "/register", "/auth"];
function isWithin(pathname: string, prefix: string) { return pathname === prefix || pathname.startsWith(prefix + "/"); }

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isPullRequestPreview) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return NextResponse.json({ success: false, error: { code: "PREVIEW_READ_ONLY", message: "This pull-request preview is read-only. Sign-in and changes are disabled." } }, { status: 403 });
    }
    if (roleForPath(pathname) || privateApiPrefixes.some(prefix => isWithin(pathname, prefix)) || authPagePrefixes.some(prefix => isWithin(pathname, prefix))) {
      return NextResponse.redirect(new URL("/products", request.url));
    }
    return NextResponse.next();
  }

  // The buyer dashboard is retired. Legacy customer data is retained, but all visitors use public browsing.
  if (isWithin(pathname, "/customer")) return NextResponse.redirect(new URL("/products", request.url));

  // Public browsing, search and listing pages do not require a Supabase session.
  if (!roleForPath(pathname)) return NextResponse.next();
  const { response, user } = await updateSession(request);
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return redirectWithCookies(loginUrl, response);
  }
  return response ?? NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
