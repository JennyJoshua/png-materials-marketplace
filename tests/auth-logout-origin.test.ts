"use strict";

import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  getAuthUser: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { signOut: mocks.signOut } }),
}));
vi.mock("@/lib/auth/session", () => ({ getAuthUser: mocks.getAuthUser }));
vi.mock("@/lib/security/audit", () => ({ writeAuditLog: vi.fn() }));

import { POST as logout } from "@/app/api/auth/logout/route";

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  vi.clearAllMocks();
});

describe("POST /api/auth/logout public redirect", () => {
  it("redirects to the configured public site, not Render's internal request URL", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://png-materials-marketplace.onrender.com";
    mocks.getAuthUser.mockResolvedValue(null);
    mocks.signOut.mockResolvedValue({ error: null });

    const request = new Request("http://localhost:10000/api/auth/logout", {
      method: "POST",
      headers: {
        origin: "https://png-materials-marketplace.onrender.com",
        "x-forwarded-host": "png-materials-marketplace.onrender.com",
        accept: "text/html",
      },
    });

    const response = await logout(request);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://png-materials-marketplace.onrender.com/login");
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });
});
