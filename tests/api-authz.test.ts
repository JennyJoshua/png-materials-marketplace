import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabaseUser } from "./helpers";

const h = vi.hoisted(() => ({
  auth: { getUser: vi.fn() },
  prisma: { user: { findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() } },
}));

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: h.auth }) }));
vi.mock("@/lib/db/prisma", () => ({ prisma: h.prisma }));
vi.mock("@/lib/security/audit", () => ({ writeAuditLog: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { GET as me } from "@/app/api/users/me/route";
import { GET as adminUsers } from "@/app/api/admin/users/route";

const MY_ID = "11111111-1111-4111-8111-111111111111";

function signedInAs(role: string) {
  h.auth.getUser.mockResolvedValue({ data: { user: supabaseUser({ id: MY_ID }) }, error: null });
  h.prisma.user.findUnique.mockResolvedValue({
    id: MY_ID,
    email: "jane@example.com",
    fullName: "Jane Kila",
    phone: "+675 7000 1234",
    role,
    status: "ACTIVE",
    createdAt: new Date("2026-10-05"),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  h.prisma.user.findMany.mockResolvedValue([{ id: "a", email: "a@x.test", fullName: "A", role: "CUSTOMER", status: "ACTIVE", createdAt: new Date() }]);
});

describe("GET /api/users/me", () => {
  it("returns 401 when signed out", async () => {
    h.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error("none") });
    expect((await me()).status).toBe(401);
  });

  it("returns only the caller's own safe profile fields", async () => {
    signedInAs("CUSTOMER");
    const res = await me();
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(Object.keys(data).sort()).toEqual(["createdAt", "email", "fullName", "id", "phone", "role", "status"]);
    expect(JSON.stringify(data)).not.toMatch(/password|hash|token|metadata/i);
  });

  it("always looks up the verified identity - there is no id the caller can change", async () => {
    signedInAs("CUSTOMER");
    await me();
    expect(h.prisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: MY_ID } }));
    expect(me.length).toBe(0); // the handler accepts no request/id parameter at all
  });
});

describe("GET /api/admin/users", () => {
  it("returns 401 when signed out", async () => {
    h.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error("none") });
    expect((await adminUsers()).status).toBe(401);
    expect(h.prisma.user.findMany).not.toHaveBeenCalled();
  });

  it.each(["CUSTOMER", "SUPPLIER"])("returns 403 for %s and never queries the user list", async (role) => {
    signedInAs(role);
    expect((await adminUsers()).status).toBe(403);
    expect(h.prisma.user.findMany).not.toHaveBeenCalled();
  });

  it("returns the list to an ADMIN, limited to safe fields", async () => {
    signedInAs("ADMIN");
    const res = await adminUsers();
    expect(res.status).toBe(200);
    const args = h.prisma.user.findMany.mock.calls[0]![0];
    expect(args.take).toBe(50);
    expect(Object.keys(args.select).sort()).toEqual(["createdAt", "email", "fullName", "id", "role", "status"]);
  });
});
