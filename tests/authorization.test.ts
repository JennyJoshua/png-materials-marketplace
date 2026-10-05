import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabaseUser } from "./helpers";

const h = vi.hoisted(() => ({
  auth: { getUser: vi.fn(), getSession: vi.fn(), signOut: vi.fn() },
  prisma: { user: { findUnique: vi.fn(), update: vi.fn() } },
}));

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: h.auth }) }));
vi.mock("@/lib/db/prisma", () => ({ prisma: h.prisma }));
vi.mock("@/lib/security/audit", () => ({ writeAuditLog: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

import { requireApiAccess, requirePageRole, resolveAccess } from "@/lib/auth/guards";
import type { Role } from "@/lib/roles";

function signedOut() {
  h.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error("no session") });
}

function signedInAs(role: Role, extra: { status?: string; authUser?: Parameters<typeof supabaseUser>[0] } = {}) {
  const authUser = supabaseUser(extra.authUser);
  h.auth.getUser.mockResolvedValue({ data: { user: authUser }, error: null });
  h.prisma.user.findUnique.mockResolvedValue({
    id: authUser.id,
    email: "jane@example.com",
    fullName: "Jane Kila",
    phone: null,
    role,
    status: extra.status ?? "ACTIVE",
    createdAt: new Date("2026-10-05"),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("authentication gate", () => {
  it("blocks an unauthenticated user from a protected dashboard (page redirect to login)", async () => {
    signedOut();
    await expect(requirePageRole("CUSTOMER", "/customer/dashboard")).rejects.toThrow(
      "REDIRECT:/login?next=%2Fcustomer%2Fdashboard",
    );
  });

  it("returns 401 for an unauthenticated API request", async () => {
    signedOut();
    const { response } = await requireApiAccess(["ADMIN"]);
    expect(response?.status).toBe(401);
  });

  it("verifies identity with getUser() and never trusts getSession()", async () => {
    signedInAs("CUSTOMER");
    await resolveAccess(["CUSTOMER"]);
    expect(h.auth.getUser).toHaveBeenCalled();
    expect(h.auth.getSession).not.toHaveBeenCalled();
  });

  it("treats a token Supabase rejects as signed out", async () => {
    h.auth.getUser.mockResolvedValue({ data: { user: supabaseUser() }, error: new Error("invalid JWT") });
    expect(await resolveAccess()).toEqual({ ok: false, reason: "unauthenticated" });
  });
});

describe("role authorization (server-side, database role)", () => {
  it("CUSTOMER cannot open the SUPPLIER dashboard", async () => {
    signedInAs("CUSTOMER");
    await expect(requirePageRole("SUPPLIER", "/supplier/dashboard")).rejects.toThrow("REDIRECT:/customer/dashboard");
  });

  it("CUSTOMER cannot open the ADMIN dashboard", async () => {
    signedInAs("CUSTOMER");
    await expect(requirePageRole("ADMIN", "/admin/dashboard")).rejects.toThrow("REDIRECT:/customer/dashboard");
  });

  it("SUPPLIER cannot open the ADMIN dashboard", async () => {
    signedInAs("SUPPLIER");
    await expect(requirePageRole("ADMIN", "/admin/dashboard")).rejects.toThrow("REDIRECT:/supplier/dashboard");
  });

  it("ADMIN can open the ADMIN dashboard", async () => {
    signedInAs("ADMIN");
    const user = await requirePageRole("ADMIN", "/admin/dashboard");
    expect(user.role).toBe("ADMIN");
  });

  it("each role can open its own dashboard", async () => {
    signedInAs("CUSTOMER");
    expect((await requirePageRole("CUSTOMER", "/customer/dashboard")).role).toBe("CUSTOMER");
    signedInAs("SUPPLIER");
    expect((await requirePageRole("SUPPLIER", "/supplier/dashboard")).role).toBe("SUPPLIER");
  });

  it("returns 403 (not data) when an API caller has the wrong role", async () => {
    signedInAs("CUSTOMER");
    const { response, user } = await requireApiAccess(["ADMIN"]);
    expect(user).toBeUndefined();
    expect(response?.status).toBe(403);
  });

  it("blocks suspended accounts", async () => {
    signedInAs("CUSTOMER", { status: "SUSPENDED" });
    expect(await resolveAccess(["CUSTOMER"])).toEqual({ ok: false, reason: "suspended" });
    await expect(requirePageRole("CUSTOMER", "/customer/dashboard")).rejects.toThrow("REDIRECT:/login?error=suspended");
  });
});

describe("role source: the database is authoritative", () => {
  it("ignores role claims in user_metadata and app_metadata when the database says CUSTOMER", async () => {
    signedInAs("CUSTOMER", {
      authUser: {
        user_metadata: { role: "ADMIN", user_role: "ADMIN" },
        app_metadata: { role: "ADMIN", registration_type: "CUSTOMER" },
      },
    });
    const access = await resolveAccess(["ADMIN"]);
    expect(access).toMatchObject({ ok: false, reason: "forbidden" });
    await expect(requirePageRole("ADMIN", "/admin/dashboard")).rejects.toThrow("REDIRECT:/customer/dashboard");
    expect((await requireApiAccess(["ADMIN"])).response?.status).toBe(403);
  });

  it("grants ADMIN only when the database role is ADMIN, whatever the metadata says", async () => {
    signedInAs("ADMIN", { authUser: { user_metadata: { role: "CUSTOMER" }, app_metadata: {} } });
    expect((await resolveAccess(["ADMIN"])).ok).toBe(true);
  });
});

describe("profile sync on access", () => {
  it("activates a PENDING user once the e-mail is confirmed", async () => {
    signedInAs("CUSTOMER", { status: "PENDING" });
    h.prisma.user.update.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      email: "jane@example.com",
      fullName: "Jane Kila",
      phone: null,
      role: "CUSTOMER",
      status: "ACTIVE",
      createdAt: new Date(),
    });
    const access = await resolveAccess(["CUSTOMER"]);
    expect(access.ok).toBe(true);
    expect(h.prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "ACTIVE" } }),
    );
  });

  it("reports no_profile when the profile is missing and cannot be recovered", async () => {
    h.auth.getUser.mockResolvedValue({ data: { user: supabaseUser() }, error: null });
    h.prisma.user.findUnique.mockResolvedValue(null);
    expect(await resolveAccess(["CUSTOMER"])).toEqual({ ok: false, reason: "no_profile" });
  });
});
