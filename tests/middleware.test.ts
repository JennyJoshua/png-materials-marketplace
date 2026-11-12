import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { supabaseUser } from "./helpers";
const h = vi.hoisted(() => ({ updateSession: vi.fn() }));
vi.mock("@/lib/supabase/middleware", async () => {
  const actual = await vi.importActual<typeof import("@/lib/supabase/middleware")>("@/lib/supabase/middleware");
  return { ...actual, updateSession: h.updateSession };
});
import { config, middleware } from "@/middleware";
const at = (path: string) => new NextRequest(`https://app.test${path}`);
beforeEach(() => vi.clearAllMocks());

describe("middleware (first line of defence)", () => {
  it("redirects an unauthenticated provider-area visitor to provider sign-in", async () => {
    h.updateSession.mockResolvedValue({ response: NextResponse.next(), user: null });
    const path = "/supplier/dashboard";
    const res = await middleware(at(path));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`https://app.test/login?next=${encodeURIComponent(path)}`);
  });
  it("redirects an unauthenticated administrator-area visitor to admin sign-in", async () => {
    h.updateSession.mockResolvedValue({ response: NextResponse.next(), user: null });
    const path = "/admin/dashboard";
    const res = await middleware(at(path));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`https://app.test/admin/login?next=${encodeURIComponent(path)}`);
  });
  it("allows the dedicated admin sign-in page without refreshing a session", async () => {
    const res = await middleware(at("/admin/login"));
    expect(res.status).toBe(200);
    expect(h.updateSession).not.toHaveBeenCalled();
  });
  it("allows administrator password recovery without requiring a session", async () => {
    const res = await middleware(at("/admin/forgot-password"));
    expect(res.status).toBe(200);
    expect(h.updateSession).not.toHaveBeenCalled();
  });
  it("allows public marketplace pages without refreshing or requiring a session", async () => {
    const res = await middleware(at("/products"));
    expect(res.status).toBe(200);
    expect(h.updateSession).not.toHaveBeenCalled();
  });
  it("redirects the retired customer dashboard to public browsing without sign-in", async () => {
    const res = await middleware(at("/customer/dashboard"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://app.test/products");
    expect(h.updateSession).not.toHaveBeenCalled();
  });
  it("lets a verified session through for a protected area (role is enforced server-side)", async () => {
    h.updateSession.mockResolvedValue({ response: NextResponse.next(), user: supabaseUser() });
    const res = await middleware(at("/admin/dashboard"));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });
  it("keeps refreshed session cookies when it redirects", async () => {
    const refreshed = NextResponse.next();
    refreshed.cookies.set("sb-refresh", "new-value");
    h.updateSession.mockResolvedValue({ response: refreshed, user: null });
    const res = await middleware(at("/supplier/dashboard"));
    expect(res.cookies.get("sb-refresh")?.value).toBe("new-value");
  });
  it("runs broadly so preview mode can block server actions and API writes", () => {
    expect(config.matcher).toEqual(["/((?!_next/static|_next/image|favicon.ico).*)"]);
  });
});
