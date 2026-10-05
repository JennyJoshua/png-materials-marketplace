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
  it.each(["/customer/dashboard", "/supplier/dashboard", "/admin/dashboard"])(
    "redirects an unauthenticated visitor from %s to /login with a next parameter",
    async (path) => {
      h.updateSession.mockResolvedValue({ response: NextResponse.next(), user: null });
      const res = await middleware(at(path));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(`https://app.test/login?next=${encodeURIComponent(path)}`);
    },
  );

  it("lets a verified session through (role is enforced server-side, not here)", async () => {
    h.updateSession.mockResolvedValue({ response: NextResponse.next(), user: supabaseUser() });
    const res = await middleware(at("/admin/dashboard"));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("keeps refreshed session cookies when it redirects", async () => {
    const refreshed = NextResponse.next();
    refreshed.cookies.set("sb-refresh", "new-value");
    h.updateSession.mockResolvedValue({ response: refreshed, user: null });
    const res = await middleware(at("/customer/dashboard"));
    expect(res.cookies.get("sb-refresh")?.value).toBe("new-value");
  });

  it("only runs on the three protected areas", () => {
    expect(config.matcher).toEqual(["/customer/:path*", "/supplier/:path*", "/admin/:path*"]);
  });
});
