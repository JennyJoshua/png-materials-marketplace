/**
 * Phase 1 stabilisation: what happens when the DATABASE fails after Supabase Auth has already
 * succeeded (for example an invalid DATABASE_URL on the host). The user must never be left half
 * signed in, API callers must get a clean 503 (not a bare 500), and the response and the server
 * log must never contain the connection string or any secret.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { customerForm, jsonRequest, supabaseUser } from "./helpers";

const h = vi.hoisted(() => ({
  auth: { signUp: vi.fn(), signInWithPassword: vi.fn(), signOut: vi.fn(), exchangeCodeForSession: vi.fn(), getUser: vi.fn() },
  syncAppUser: vi.fn(),
  getAuthUser: vi.fn(),
  userUpdate: vi.fn(),
  audit: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: h.auth }) }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: () => ({ auth: { admin: { updateUserById: vi.fn() } } }) }));
vi.mock("@/lib/auth/session", () => ({ syncAppUser: h.syncAppUser, getAuthUser: h.getAuthUser }));
vi.mock("@/lib/db/prisma", () => ({ prisma: { user: { update: h.userUpdate } } }));
vi.mock("@/lib/security/audit", () => ({ writeAuditLog: h.audit }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { POST as login } from "@/app/api/auth/login/route";
import { POST as register } from "@/app/api/auth/register/route";
import { GET as callback } from "@/app/auth/callback/route";
import { GET as me } from "@/app/api/users/me/route";
import { GET as adminUsers } from "@/app/api/admin/users/route";
import { ConfigError } from "@/lib/env";
import { isDatabaseError } from "@/lib/db/errors";
import { loginIpLimiter, loginLimiter, registerLimiter } from "@/lib/security/rate-limit";

const SECRET_URL = "postgresql://postgres.abcd:SuperSecret!Pw@aws-0-ap.pooler.supabase.com:6543/postgres";
const goodLogin = { email: "jane@example.com", password: "correct horse 42" };

/** Same shape as the error Prisma throws at the first query when DATABASE_URL cannot be parsed. */
const badUrlError = () =>
  Object.assign(
    new Error(`The provided database string is invalid. Error parsing connection string: invalid port number in database URL. (${SECRET_URL})`),
    { name: "PrismaClientInitializationError", clientVersion: "6.19.3", errorCode: undefined },
  );

let consoleError: ReturnType<typeof vi.spyOn>;
const logged = () => consoleError.mock.calls.map((c: unknown[]) => String(c[0])).join("\n");

beforeEach(() => {
  vi.clearAllMocks();
  registerLimiter.reset();
  loginLimiter.reset();
  loginIpLimiter.reset();
  h.auth.signOut.mockResolvedValue({ error: null });
  h.userUpdate.mockResolvedValue({});
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => consoleError.mockRestore());

describe("isDatabaseError", () => {
  it("recognises Prisma connection, parsing and request errors, and nothing else", () => {
    for (const name of ["PrismaClientInitializationError", "PrismaClientKnownRequestError", "PrismaClientUnknownRequestError", "PrismaClientRustPanicError"]) {
      expect(isDatabaseError(Object.assign(new Error("x"), { name })), name).toBe(true);
    }
    expect(isDatabaseError(new Error("db down"))).toBe(false);
    expect(isDatabaseError(new TypeError("boom"))).toBe(false);
    expect(isDatabaseError(Object.assign(new Error("x"), { name: "PrismaClientValidationError" }))).toBe(false); // a code bug, not an outage
    expect(isDatabaseError("string")).toBe(false);
    expect(isDatabaseError(null)).toBe(false);
  });
});

describe("login when the database fails AFTER Supabase sign-in succeeded", () => {
  it("signs the user out and answers 503, never leaving a half signed-in session", async () => {
    h.auth.signInWithPassword.mockResolvedValue({ data: { user: supabaseUser() }, error: null });
    h.syncAppUser.mockRejectedValue(badUrlError());

    const res = await login(jsonRequest("/api/auth/login", { body: goodLogin }));
    const text = await res.text();

    expect(res.status).toBe(503);
    expect(JSON.parse(text).error.code).toBe("DATABASE_UNAVAILABLE");
    expect(h.auth.signOut).toHaveBeenCalledTimes(1);
    expect(text).not.toMatch(/postgres|SuperSecret|pooler|supabase\.com|6543/i);
    expect(logged()).not.toMatch(/SuperSecret/);
    expect(logged()).toContain("invalid port number");
  });

  it("does the same when only the last-login update fails", async () => {
    h.auth.signInWithPassword.mockResolvedValue({ data: { user: supabaseUser() }, error: null });
    h.syncAppUser.mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111", role: "CUSTOMER", status: "ACTIVE" });
    h.userUpdate.mockRejectedValue(badUrlError());

    const res = await login(jsonRequest("/api/auth/login", { body: goodLogin }));
    expect(res.status).toBe(503);
    expect(h.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it("a plain bug is still a 500, and a signed-in session is still ended", async () => {
    h.auth.signInWithPassword.mockResolvedValue({ data: { user: supabaseUser() }, error: null });
    h.syncAppUser.mockRejectedValue(new TypeError("unexpected"));
    const res = await login(jsonRequest("/api/auth/login", { body: goodLogin }));
    expect(res.status).toBe(500);
    expect(h.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it("does not try to sign out when sign-in itself never succeeded", async () => {
    h.auth.signInWithPassword.mockRejectedValue(new Error("network"));
    const res = await login(jsonRequest("/api/auth/login", { body: goodLogin }));
    expect(res.status).toBe(500);
    expect(h.auth.signOut).not.toHaveBeenCalled();
  });

  it("survives a failing sign-out while reporting the database problem", async () => {
    h.auth.signInWithPassword.mockResolvedValue({ data: { user: supabaseUser() }, error: null });
    h.syncAppUser.mockRejectedValue(badUrlError());
    h.auth.signOut.mockRejectedValue(new Error("network"));
    const res = await login(jsonRequest("/api/auth/login", { body: goodLogin }));
    expect(res.status).toBe(503);
  });
});

describe("e-mail confirmation callback when the database fails", () => {
  // These tests assert the request origin, so they must not depend on a NEXT_PUBLIC_SITE_URL in the shell.
  beforeEach(() => vi.stubEnv("NEXT_PUBLIC_SITE_URL", ""));
  afterEach(() => vi.unstubAllEnvs());
  const req = () => new Request("https://app.test/auth/callback?code=abc123");

  it("ends the session and sends the user to a clear notice, not an error page", async () => {
    h.auth.exchangeCodeForSession.mockResolvedValue({ data: { user: supabaseUser() }, error: null });
    h.syncAppUser.mockRejectedValue(badUrlError());

    const res = await callback(req());
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://app.test/login?error=unavailable");
    expect(h.auth.signOut).toHaveBeenCalledTimes(1);
    expect(logged()).not.toMatch(/SuperSecret/);
  });

  it("handles a missing Supabase configuration the same way", async () => {
    h.auth.exchangeCodeForSession.mockRejectedValue(new ConfigError("Supabase is not configured", ["NEXT_PUBLIC_SUPABASE_URL"]));
    const res = await callback(req());
    expect(res.headers.get("location")).toBe("https://app.test/login?error=unavailable");
    expect(h.auth.signOut).not.toHaveBeenCalled(); // nothing was signed in
  });

  it("still sends a bad or expired code to the existing callback notice", async () => {
    h.auth.exchangeCodeForSession.mockResolvedValue({ data: { user: null }, error: { message: "expired" } });
    const res = await callback(req());
    expect(res.headers.get("location")).toBe("https://app.test/login?error=callback");
  });
});

describe("protected API routes when the database fails", () => {
  beforeEach(() => {
    h.getAuthUser.mockResolvedValue(supabaseUser());
  });

  it("GET /api/users/me answers 503 JSON (not a bare 500) and leaks nothing", async () => {
    h.syncAppUser.mockRejectedValue(badUrlError());
    const res = await me();
    const text = await res.text();
    expect(res.status).toBe(503);
    expect(JSON.parse(text).error.code).toBe("DATABASE_UNAVAILABLE");
    expect(text).not.toMatch(/postgres|SuperSecret|pooler/i);
  });

  it("GET /api/admin/users does the same", async () => {
    h.syncAppUser.mockRejectedValue(badUrlError());
    const res = await adminUsers();
    expect(res.status).toBe(503);
  });

  it("reports missing configuration as 503 SERVER_NOT_CONFIGURED", async () => {
    h.getAuthUser.mockRejectedValue(new ConfigError("Supabase is not configured", ["NEXT_PUBLIC_SUPABASE_URL"]));
    const res = await me();
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("SERVER_NOT_CONFIGURED");
  });

  it("does not hide programming errors: they still surface", async () => {
    h.syncAppUser.mockRejectedValue(new TypeError("bug"));
    await expect(me()).rejects.toThrow("bug");
  });

  it("an unauthenticated caller still gets 401, not 503", async () => {
    h.getAuthUser.mockResolvedValue(null);
    const res = await me();
    expect(res.status).toBe(401);
  });
});

describe("sign-up error mapping", () => {
  it("maps Supabase's weak_password to a clear 400 without echoing the password", async () => {
    h.auth.signUp.mockResolvedValue({ data: { user: null, session: null }, error: { code: "weak_password", status: 422, message: "Password should be at least 12 characters" } });
    const res = await register(jsonRequest("/api/auth/register", { body: customerForm }));
    const text = await res.text();
    expect(res.status).toBe(400);
    expect(JSON.parse(text).error.code).toBe("WEAK_PASSWORD");
    expect(text).not.toContain(customerForm.password);
  });
});
