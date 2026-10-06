import { NextResponse } from "next/server";

export function jsonOk<T>(data: T, status = 200, headers?: HeadersInit) {
  return NextResponse.json({ success: true, data }, { status, headers });
}

export function jsonError(status: number, code: string, message: string, headers?: HeadersInit) {
  return NextResponse.json({ success: false, error: { code, message } }, { status, headers });
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
