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
