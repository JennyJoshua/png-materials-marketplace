import { NextResponse } from "next/server";
import { ConfigError } from "@/lib/env";

export function jsonOk<T>(data: T, status = 200, headers?: HeadersInit) {
  return NextResponse.json({ success: true, data }, { status, headers });
}

export function jsonError(status: number, code: string, message: string, headers?: HeadersInit) {
  return NextResponse.json({ success: false, error: { code, message } }, { status, headers });
}

/**
 * Response for a server that is missing configuration. Production users get a generic message;
 * in development the message names the missing variables (never their values) to speed up setup.
 */
export function configErrorResponse(error: ConfigError) {
  const message =
    process.env.NODE_ENV === "development"
      ? error.message
      : "The service is not available right now. Please try again later.";
  return jsonError(503, "SERVER_NOT_CONFIGURED", message);
}

/** Safe answer when the database cannot be used. The cause goes to the server log, never to the client. */
export function databaseUnavailableResponse() {
  return jsonError(503, "DATABASE_UNAVAILABLE", "The service is temporarily unavailable. Please try again shortly.");
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip") || "unknown";
}

/**
 * CSRF defence for state-changing requests: the browser must prove the request came from our own
 * origin (Origin header, or Sec-Fetch-Site as a fallback). Requests with neither are rejected.
 */
export function isSameOrigin(request: Request): boolean {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return host !== null && new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  const site = request.headers.get("sec-fetch-site");
  return site === "same-origin" || site === "none";
}

/** Origin used for auth e-mail redirect links. Prefers the verified request origin. */
let warnedUnusableSiteUrl = false;
let warnedMissingSiteUrl = false;

/**
 * The origin to use in redirects sent to the browser (scheme + host + port, nothing else).
 *
 * Behind a hosting proxy such as Render, `request.url` holds the server's own internal address
 * (for example http://localhost:10000), even when the browser used the public host name. So the
 * explicitly configured NEXT_PUBLIC_SITE_URL wins. Only http and https values are accepted. Any
 * path, query, fragment or credentials in the value are dropped. It comes from configuration,
 * never from the request, so a caller cannot steer it.
 *
 * If the setting is missing or unusable this falls back to the request's origin, and says so once
 * in the server log (naming the variable, never printing its value), because behind a proxy that
 * fallback is exactly the bug this exists to prevent.
 *
 * NEXT_PUBLIC_* values can be fixed into the build, so set it before the service is built.
 */
export function getPublicOrigin(request: Request): string {
  const requestOrigin = new URL(request.url).origin;
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!configured) {
    if (process.env.NODE_ENV === "production" && !warnedMissingSiteUrl) {
      warnedMissingSiteUrl = true;
      console.warn("[config] NEXT_PUBLIC_SITE_URL is not set. Redirects use the request origin, which is the internal address behind a hosting proxy.");
    }
    return requestOrigin;
  }

  try {
    const parsed = new URL(configured);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.origin;
  } catch {
    // not a URL at all: handled below
  }
  if (!warnedUnusableSiteUrl) {
    warnedUnusableSiteUrl = true;
    console.warn("[config] NEXT_PUBLIC_SITE_URL is set but is not a valid http(s) URL (it must look like https://your-domain). Redirects fall back to the request origin, which is wrong behind a hosting proxy.");
  }
  return requestOrigin;
}

export function getSiteUrl(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (origin) return origin;
  return process.env.NEXT_PUBLIC_SITE_URL ?? null;
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
