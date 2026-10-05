import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabaseUser } from "./helpers";
import { createFakeDb } from "./fake-db";

const h = vi.hoisted(() => ({ db: undefined as unknown }));

vi.mock("@/lib/db/prisma", () => ({
  get prisma() {
    return h.db;
  },
}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: {} }) }));
vi.mock("@/lib/security/audit", () => ({ writeAuditLog: vi.fn() }));

import { recoverProfile } from "@/lib/auth/session";

const validMeta = { full_name: "Jane Kila", phone: "+675 7000 1234" };
const supplierMeta = {
  ...validMeta,
  business_name: "Highlands Hardware",
  business_address: "Section 12",
  location: "Mount Hagen",
};

let db: ReturnType<typeof createFakeDb>;

beforeEach(() => {
  db = createFakeDb();
  h.db = db;
});

describe("recoverProfile (Auth user exists, profile missing)", () => {
  it("rebuilds a CUSTOMER profile from the trusted registration hint", async () => {
    const user = await recoverProfile(
      supabaseUser({ app_metadata: { registration_type: "CUSTOMER" }, user_metadata: validMeta }),
    );
    expect(user).not.toBeNull();
    expect(db.state.users[0]).toMatchObject({ role: "CUSTOMER", fullName: "Jane Kila" });
    expect(db.state.customerProfiles).toHaveLength(1);
  });

  it("rebuilds a SUPPLIER profile when business details are present", async () => {
    await recoverProfile(supabaseUser({ app_metadata: { registration_type: "SUPPLIER" }, user_metadata: supplierMeta }));
    expect(db.state.users[0]?.role).toBe("SUPPLIER");
    expect(db.state.supplierProfiles[0]).toMatchObject({ businessName: "Highlands Hardware" });
  });

  it("ignores a role placed in user_metadata (cannot self-promote to ADMIN)", async () => {
    await recoverProfile(
      supabaseUser({
        app_metadata: { registration_type: "CUSTOMER" },
        user_metadata: { ...validMeta, role: "ADMIN", registration_type: "ADMIN" },
      }),
    );
    expect(db.state.users[0]?.role).toBe("CUSTOMER");
  });

  it("does not recover without the server-written hint (user_metadata alone is not trusted)", async () => {
    const result = await recoverProfile(supabaseUser({ app_metadata: {}, user_metadata: { ...validMeta, role: "CUSTOMER" } }));
    expect(result).toBeNull();
    expect(db.state.users).toHaveLength(0);
  });

  it("never recovers an ADMIN, even if the hint says ADMIN", async () => {
    const result = await recoverProfile(
      supabaseUser({ app_metadata: { registration_type: "ADMIN", role: "ADMIN" }, user_metadata: validMeta }),
    );
    expect(result).toBeNull();
    expect(db.state.users).toHaveLength(0);
  });

  it("returns null when the descriptive metadata is invalid", async () => {
    const result = await recoverProfile(
      supabaseUser({ app_metadata: { registration_type: "CUSTOMER" }, user_metadata: { full_name: "J" } }),
    );
    expect(result).toBeNull();
    expect(db.state.users).toHaveLength(0);
  });

  it("returns null for a supplier hint without business details", async () => {
    const result = await recoverProfile(
      supabaseUser({ app_metadata: { registration_type: "SUPPLIER" }, user_metadata: validMeta }),
    );
    expect(result).toBeNull();
    expect(db.state.users).toHaveLength(0);
  });

  it("returns null (does not throw) when the database is down", async () => {
    db.failOnce("customerProfile.create", new Error("db down"));
    const result = await recoverProfile(
      supabaseUser({ app_metadata: { registration_type: "CUSTOMER" }, user_metadata: validMeta }),
    );
    expect(result).toBeNull();
  });
});
