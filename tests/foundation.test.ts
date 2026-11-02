import { describe, expect, it, vi } from "vitest";

// Tests never touch a real database client.
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));

import { CATEGORIES } from "../prisma/categories";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { sanitizeMetadata } from "@/lib/security/audit";
import { loginSchema, registerSchema } from "@/lib/validation/auth";
import { isSafeRelativePath, postLoginPath, roleForPath } from "@/lib/roles";

describe("category seed data", () => {
  it("contains the 15 required categories, unique, in order", () => {
    expect(CATEGORIES).toHaveLength(15);
    expect(new Set(CATEGORIES).size).toBe(15);
    expect(CATEGORIES[0]).toBe("Cement & Concrete");
    expect(CATEGORIES[14]).toBe("Other");
  });
});

describe("in-memory rate limiter", () => {
  it("blocks after the limit and recovers when the window passes", () => {
    let now = 1_000;
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000, now: () => now });
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(true);
    const blocked = limiter.check("a");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(limiter.check("b").allowed).toBe(true);
    now += 1001;
    expect(limiter.check("a").allowed).toBe(true);
  });
});

describe("audit metadata", () => {
  it("drops anything that looks like a credential and keeps plain facts", () => {
    const clean = sanitizeMetadata({
      accountType: "CUSTOMER",
      password: "x",
      access_token: "y",
      refreshToken: "z",
      serviceKey: "k",
      cookie: "c",
      attempts: 2,
      nested: { a: 1 },
    });
    expect(clean).toEqual({ accountType: "CUSTOMER", attempts: 2 });
  });
});

describe("validation", () => {
  const base = { fullName: "Jenny Joshua", email: "  Jenny@Example.COM ", phone: "+675 7000 0000", password: "longenough1", confirmPassword: "longenough1" };
  const individual = { accountType: "INDIVIDUAL_PROVIDER", ...base, displayName: "Jenny Joshua", providerType: "BOTH", province: "Gulf" };

  it("normalises email and accepts an individual provider", () => {
    const parsed = registerSchema.safeParse(individual);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.email).toBe("jenny@example.com");
  });
  it("accepts a business provider and rejects buyer registration", () => {
    expect(registerSchema.safeParse({ accountType: "BUSINESS_PROVIDER", ...base, displayName: "Highlands Hardware", providerType: "PRODUCTS", province: "Western Highlands" }).success).toBe(true);
    expect(registerSchema.safeParse({ accountType: "CUSTOMER", ...base }).success).toBe(false);
    expect(registerSchema.safeParse({ accountType: "SUPPLIER", ...base }).success).toBe(false);
  });
  it("rejects ADMIN, unknown account types and extra role fields", () => {
    expect(registerSchema.safeParse({ accountType: "ADMIN", ...base }).success).toBe(false);
    expect(registerSchema.safeParse({ ...individual, role: "ADMIN" }).success).toBe(false);
  });
  it("enforces password rules, matching confirmation and valid email/phone", () => {
    expect(registerSchema.safeParse({ ...individual, password: "short1", confirmPassword: "short1" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...individual, password: "nodigitshere", confirmPassword: "nodigitshere" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...individual, confirmPassword: "different11" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...individual, email: "not-an-email" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...individual, phone: "abc" }).success).toBe(false);
  });
  it("login schema rejects unknown fields such as role", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x", role: "ADMIN" }).success).toBe(false);
  });
});

describe("routing helpers", () => {
  it("maps paths to their owning role", () => {
    expect(roleForPath("/customer/dashboard")).toBe("CUSTOMER");
    expect(roleForPath("/supplier")).toBe("SUPPLIER");
    expect(roleForPath("/admin/anything")).toBe("ADMIN");
    expect(roleForPath("/login")).toBeNull();
    expect(roleForPath("/administrator")).toBeNull();
  });

  it("rejects open-redirect targets", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "", "/a\nb"]) {
      expect(isSafeRelativePath(bad), bad).toBe(false);
    }
    expect(isSafeRelativePath("/customer/dashboard")).toBe(true);
  });

  it("never sends a user to another role's area after login", () => {
    expect(postLoginPath("CUSTOMER", "/admin/dashboard")).toBe("/products");
    expect(postLoginPath("CUSTOMER", "/customer/dashboard")).toBe("/products");
    expect(postLoginPath("ADMIN", "/admin/dashboard")).toBe("/admin/dashboard");
    expect(postLoginPath("SUPPLIER", "https://evil.example")).toBe("/supplier/dashboard");
  });
});
