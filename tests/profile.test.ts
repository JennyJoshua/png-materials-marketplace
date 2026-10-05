import { describe, expect, it, vi } from "vitest";

// Tests never touch the real Prisma client or a database.
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));

import { ensureProfile, ProfileError, type ProfileSeed } from "@/lib/auth/profile";
import { createFakeDb } from "./fake-db";

const AUTH_ID = "22222222-2222-4222-8222-222222222222";

const customerSeed: ProfileSeed = {
  authUserId: AUTH_ID,
  email: "Jane@Example.com",
  fullName: "Jane Kila",
  phone: "+675 7000 1234",
  role: "CUSTOMER",
  emailConfirmed: false,
};

const supplierSeed: ProfileSeed = {
  ...customerSeed,
  role: "SUPPLIER",
  supplier: { businessName: "Highlands Hardware", businessAddress: "Section 12", location: "Mount Hagen" },
};

describe("profile creation and role assignment", () => {
  it("creates a CUSTOMER user (id = Supabase UUID, lowercase email) plus a customer profile", async () => {
    const db = createFakeDb();
    await ensureProfile(customerSeed, db);
    expect(db.state.users).toHaveLength(1);
    expect(db.state.users[0]).toMatchObject({ id: AUTH_ID, role: "CUSTOMER", email: "jane@example.com", status: "PENDING" });
    expect(db.state.users[0]).not.toHaveProperty("password");
    expect(db.state.users[0]).not.toHaveProperty("passwordHash");
    expect(db.state.customerProfiles).toHaveLength(1);
    expect(db.state.supplierProfiles).toHaveLength(0);
  });

  it("marks the user ACTIVE when the e-mail is already confirmed", async () => {
    const db = createFakeDb();
    await ensureProfile({ ...customerSeed, emailConfirmed: true }, db);
    expect(db.state.users[0]?.status).toBe("ACTIVE");
  });

  it("creates a SUPPLIER user plus a supplier profile, never pre-verified", async () => {
    const db = createFakeDb();
    await ensureProfile(supplierSeed, db);
    expect(db.state.users[0]).toMatchObject({ role: "SUPPLIER" });
    expect(db.state.supplierProfiles).toHaveLength(1);
    expect(db.state.supplierProfiles[0]).toMatchObject({ businessName: "Highlands Hardware", location: "Mount Hagen" });
    // verificationStatus is left to the schema default (PENDING); the code never sets VERIFIED.
    expect(db.state.supplierProfiles[0]?.verificationStatus).toBeUndefined();
    expect(db.state.customerProfiles).toHaveLength(0);
  });

  it("refuses to create an ADMIN from registration", async () => {
    const db = createFakeDb();
    await expect(ensureProfile({ ...customerSeed, role: "ADMIN" as never }, db)).rejects.toMatchObject({
      code: "ROLE_NOT_ALLOWED",
    });
    expect(db.state.users).toHaveLength(0);
  });

  it("rejects any other invalid role value", async () => {
    const db = createFakeDb();
    await expect(ensureProfile({ ...customerSeed, role: "SUPERUSER" as never }, db)).rejects.toBeInstanceOf(ProfileError);
    expect(db.state.users).toHaveLength(0);
  });

  it("never changes the role of an existing user (an ADMIN stays ADMIN)", async () => {
    const db = createFakeDb();
    db.state.users.push({ id: AUTH_ID, role: "ADMIN", status: "ACTIVE" });
    await ensureProfile(customerSeed, db);
    expect(db.state.users).toHaveLength(1);
    expect(db.state.users[0]?.role).toBe("ADMIN");
    expect(db.state.customerProfiles).toHaveLength(0);
  });

  it("does not reactivate a SUSPENDED user", async () => {
    const db = createFakeDb();
    db.state.users.push({ id: AUTH_ID, role: "CUSTOMER", status: "SUSPENDED" });
    await ensureProfile({ ...customerSeed, emailConfirmed: true }, db);
    expect(db.state.users[0]?.status).toBe("SUSPENDED");
  });
});

describe("idempotency", () => {
  it("running twice creates exactly one user and one profile (customer)", async () => {
    const db = createFakeDb();
    await ensureProfile(customerSeed, db);
    await ensureProfile(customerSeed, db);
    expect(db.state.users).toHaveLength(1);
    expect(db.state.customerProfiles).toHaveLength(1);
  });

  it("running twice creates exactly one user and one profile (supplier)", async () => {
    const db = createFakeDb();
    await ensureProfile(supplierSeed, db);
    await ensureProfile(supplierSeed, db);
    expect(db.state.users).toHaveLength(1);
    expect(db.state.supplierProfiles).toHaveLength(1);
  });

  it("activates a PENDING user on a later run once the e-mail is confirmed", async () => {
    const db = createFakeDb();
    await ensureProfile(customerSeed, db);
    await ensureProfile({ ...customerSeed, emailConfirmed: true }, db);
    expect(db.state.users[0]?.status).toBe("ACTIVE");
    expect(db.state.users).toHaveLength(1);
  });
});

describe("failure and recovery", () => {
  it("Auth user exists but profile creation fails: nothing is half-written, and a retry recovers", async () => {
    const db = createFakeDb();
    db.failOnce("customerProfile.create", new Error("connection reset"));
    await expect(ensureProfile(customerSeed, db)).rejects.toThrow("connection reset");
    expect(db.state.users).toHaveLength(0); // transaction rolled back

    await ensureProfile(customerSeed, db); // retry (e.g. from /auth/callback or next sign-in)
    expect(db.state.users).toHaveLength(1);
    expect(db.state.customerProfiles).toHaveLength(1);
  });

  it("rejects a supplier without business details and leaves no partial user", async () => {
    const db = createFakeDb();
    await expect(ensureProfile({ ...supplierSeed, supplier: undefined }, db)).rejects.toMatchObject({
      code: "SUPPLIER_DETAILS_MISSING",
    });
    expect(db.state.users).toHaveLength(0);
  });

  it("survives a concurrent duplicate insert (unique violation) by retrying once", async () => {
    const db = createFakeDb();
    db.failOnce("user.create", Object.assign(new Error("Unique constraint failed"), { code: "P2002" }));
    // Simulate the concurrent request having created the row just before our insert failed.
    const original = db.user.findUnique;
    let first = true;
    db.user.findUnique = async (args) => {
      if (first) {
        first = false;
        return null;
      }
      return original(args);
    };
    db.state.users.push({ id: AUTH_ID, role: "CUSTOMER", status: "PENDING" });
    await ensureProfile(customerSeed, db);
    expect(db.state.users).toHaveLength(1);
    expect(db.state.customerProfiles).toHaveLength(1);
  });

  it("reports a conflict when the e-mail belongs to a different account", async () => {
    const db = createFakeDb();
    const dup = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
    db.failOnce("user.create", dup);
    const realCreate = db.user.create;
    let calls = 0;
    db.user.create = async (args) => {
      calls += 1;
      if (calls === 2) throw dup;
      return realCreate(args);
    };
    await expect(ensureProfile(customerSeed, db)).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
