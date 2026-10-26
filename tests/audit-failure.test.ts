/**
 * Audit logging uses the REAL audit module here. When the database string is invalid the audit write
 * fails; that must be logged safely and must never change what the user sees.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonRequest, supabaseUser } from "./helpers";

const h = vi.hoisted(() => ({
  auth: { signInWithPassword: vi.fn(), signOut: vi.fn() },
  auditCreate: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: h.auth }) }));
vi.mock("@/lib/auth/session", () => ({ syncAppUser: vi.fn(), getAuthUser: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: { user: { update: vi.fn() }, auditLog: { create: h.auditCreate } } }));

import { POST as login } from "@/app/api/auth/login/route";
import { writeAuditLog } from "@/lib/security/audit";
import { describeError } from "@/lib/security/log";
import { loginIpLimiter, loginLimiter } from "@/lib/security/rate-limit";

const URL_WITH_PASSWORD = "postgresql://postgres.abcd:SuperSecret!Pw@aws-0-ap.pooler.supabase.com:6543/postgres?pgbouncer=true";
const invalidUrl = () =>
  Object.assign(
    new Error(`The provided database string is invalid. Error parsing connection string: invalid port number in database URL. Please refer to the documentation. ${URL_WITH_PASSWORD}`),
    { name: "PrismaClientInitializationError" },
  );

let consoleError: ReturnType<typeof vi.spyOn>;
const logged = () => consoleError.mock.calls.map((c: unknown[]) => String(c[0])).join("\n");

beforeEach(() => {
  vi.clearAllMocks();
  loginLimiter.reset();
  loginIpLimiter.reset();
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("a failing audit write", () => {
  it("never changes a wrong-password answer: still the same generic 401", async () => {
    h.auth.signInWithPassword.mockResolvedValue({ data: { user: null }, error: { code: "invalid_credentials", message: "x" } });
    h.auditCreate.mockRejectedValue(invalidUrl());

    const res = await login(jsonRequest("/api/auth/login", { body: { email: "jane@example.com", password: "wrong password 1" } }));
    const text = await res.text();

    expect(res.status).toBe(401);
    expect(JSON.parse(text).error.code).toBe("INVALID_CREDENTIALS");
    expect(text).not.toMatch(/database|postgres|SuperSecret|audit/i);
  });

  it("logs the cause for the operator without the connection string, host, user or password", async () => {
    h.auth.signInWithPassword.mockResolvedValue({ data: { user: null }, error: { code: "invalid_credentials", message: "x" } });
    h.auditCreate.mockRejectedValue(invalidUrl());

    await login(jsonRequest("/api/auth/login", { body: { email: "jane@example.com", password: "wrong password 1" } }));

    const out = logged();
    expect(out).toContain("could not record USER_LOGIN_FAILED");
    expect(out).toContain("invalid port number in database URL");
    expect(out).not.toMatch(/SuperSecret|postgres\.abcd|wrong password 1/); // the host stays so operators can see which server was used
  });

  it("writeAuditLog swallows the failure instead of throwing", async () => {
    h.auditCreate.mockRejectedValue(invalidUrl());
    await expect(writeAuditLog({ userId: null, action: "USER_LOGIN_FAILED" })).resolves.toBeUndefined();
  });
});

describe("describeError with connection strings", () => {
  it("redacts credentials even when a driver puts the whole URL in the message", () => {
    const text = describeError(invalidUrl());
    expect(text).not.toContain("SuperSecret");
    expect(text).toContain("[credentials]");
    expect(text).toContain("invalid port number");
  });
});

describe("a signed-in user is not affected by an audit failure", () => {
  it("login succeeds and returns the dashboard when only the audit write fails", async () => {
    const { syncAppUser } = await import("@/lib/auth/session");
    h.auth.signInWithPassword.mockResolvedValue({ data: { user: supabaseUser() }, error: null });
    vi.mocked(syncAppUser).mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111", email: "jane@example.com", fullName: "Jane", phone: null,
      role: "CUSTOMER", status: "ACTIVE", createdAt: new Date(),
    });
    h.auditCreate.mockRejectedValue(invalidUrl());

    const res = await login(jsonRequest("/api/auth/login", { body: { email: "jane@example.com", password: "correct horse 42" } }));
    expect(res.status).toBe(200);
    expect((await res.json()).data.redirectTo).toBe("/customer/dashboard");
    expect(h.auth.signOut).not.toHaveBeenCalled();
  });
});
