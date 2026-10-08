import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { customerForm, jsonRequest, supabaseUser } from "./helpers";

const h = vi.hoisted(() => ({
  createServer: vi.fn(),
  createAdmin: vi.fn(),
  ensureProfile: vi.fn(),
  syncAppUser: vi.fn(),
  audit: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: h.createServer }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: h.createAdmin }));
vi.mock("@/lib/auth/profile", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/profile")>("@/lib/auth/profile");
  return { ...actual, ensureProfile: h.ensureProfile };
});
vi.mock("@/lib/auth/session", () => ({ syncAppUser: h.syncAppUser, getAuthUser: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: { user: { update: vi.fn() } } }));
vi.mock("@/lib/security/audit", () => ({ writeAuditLog: h.audit }));

import { POST as register } from "@/app/api/auth/register/route";
import { POST as login } from "@/app/api/auth/login/route";
import { ConfigError, getServiceRoleKey, getSupabasePublicConfig } from "@/lib/env";
import { describeError, logServerError, redact } from "@/lib/security/log";
import { loginIpLimiter, loginLimiter, registerLimiter } from "@/lib/security/rate-limit";

const SECRET_PASSWORD = customerForm.password;

describe("environment configuration errors", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("reports which variables are missing, by name only", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    try {
      getSupabasePublicConfig();
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).missing).toEqual(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]);
      expect((error as ConfigError).message).toMatch(/restart/i);
    }
  });

  it("treats whitespace-only values as missing and names only the one that is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abcd.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "   ");
    expect(() => getSupabasePublicConfig()).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY is empty or missing/);
  });

  it("rejects a Supabase URL that is not a URL, without echoing the value", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "my-secret-looking-value");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    try {
      getSupabasePublicConfig();
      expect.unreachable();
    } catch (error) {
      expect((error as Error).message).toMatch(/not a valid URL/);
      expect((error as Error).message).not.toContain("my-secret-looking-value");
    }
  });

  it("returns trimmed values when configured", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", " https://abcd.supabase.co ");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", " anon-key ");
    expect(getSupabasePublicConfig()).toEqual({ url: "https://abcd.supabase.co", anonKey: "anon-key" });
  });

  it("requires the service-role key for the privileged client", () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(() => getServiceRoleKey()).toThrow(ConfigError);
  });
});

describe("server error logging is useful and redacted", () => {
  it("redacts JWTs, database passwords, tokens and key prefixes", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.c2lnbmF0dXJlMTIzNDU2";
    const text = redact(`url=postgresql://postgres:hunter2@db.example.co:5432/postgres jwt ${jwt} password=hunter2 sb_secret_abcdef123456`);
    expect(text).not.toMatch(/hunter2|eyJhbGci|sb_secret_abcdef/);
    expect(text).toContain("db.example.co");
  });

  it("keeps the cause of a multi-line Prisma-style message and the error code", () => {
    const error = Object.assign(
      new Error("\nInvalid `prisma.user.upsert()` invocation in\n/app/lib/auth/profile.ts:20:30\n\n  17 const x = 1\n\nThe table `public.users` does not exist in the current database."),
      { name: "PrismaClientKnownRequestError", code: "P2021" },
    );
    const line = describeError(error);
    expect(line).toContain("PrismaClientKnownRequestError (P2021)");
    expect(line).toContain("The table `public.users` does not exist");
    expect(line).not.toContain("\n");
    expect(line.length).toBeLessThanOrEqual(400);
  });

  it("handles non-Error values and never prints a stack trace", () => {
    expect(describeError("boom")).toMatch(/non-Error/);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logServerError("test", new Error("plain failure"));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0]![0])).toBe("[test] Error: plain failure");
    spy.mockRestore();
  });
});

describe("registration and login report setup problems clearly", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    registerLimiter.reset();
    loginLimiter.reset();
    loginIpLimiter.reset();
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    consoleError.mockRestore();
    vi.unstubAllEnvs();
  });

  const configProblem = () => new ConfigError("Supabase is not configured: NEXT_PUBLIC_SUPABASE_URL is empty or missing.", ["NEXT_PUBLIC_SUPABASE_URL"]);

  it("register answers 503 SERVER_NOT_CONFIGURED naming the variable in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    h.createServer.mockRejectedValue(configProblem());
    const res = await register(jsonRequest("/api/auth/register", { body: customerForm }));
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(body.error.code).toBe("SERVER_NOT_CONFIGURED");
    expect(body.error.message).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(String(consoleError.mock.calls[0]![0])).toContain("ConfigError");
  });

  it("in production the same problem shows only a generic message", async () => {
    vi.stubEnv("NODE_ENV", "production");
    h.createServer.mockRejectedValue(configProblem());
    const res = await register(jsonRequest("/api/auth/register", { body: customerForm }));
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(JSON.stringify(body)).not.toMatch(/NEXT_PUBLIC|Supabase is not configured|\.env/);
  });

  it("login answers 503 for the same configuration problem", async () => {
    vi.stubEnv("NODE_ENV", "development");
    h.createServer.mockRejectedValue(configProblem());
    const res = await login(jsonRequest("/api/auth/login", { body: { email: "jane@example.com", password: "whatever123" } }));
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("SERVER_NOT_CONFIGURED");
  });

  it("an unexpected non-config failure is still a plain 500 with the cause logged", async () => {
    h.createServer.mockRejectedValue(new TypeError("cookies() was called outside a request scope"));
    const res = await register(jsonRequest("/api/auth/register", { body: customerForm }));
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("SERVER_ERROR");
    expect(String(consoleError.mock.calls[0]![0])).toContain("cookies() was called outside a request scope");
  });

  it("a failing profile insert is logged (database setup problems become visible) and never leaks the password", async () => {
    const newUser = supabaseUser({ email_confirmed_at: undefined });
    h.createServer.mockResolvedValue({ auth: { signUp: vi.fn().mockResolvedValue({ data: { user: newUser, session: null }, error: null }) } });
    h.createAdmin.mockReturnValue({ auth: { admin: { updateUserById: vi.fn().mockResolvedValue({ error: null }) } } });
    h.ensureProfile.mockRejectedValue(Object.assign(new Error("The table `public.users` does not exist in the current database."), { name: "PrismaClientKnownRequestError", code: "P2021" }));

    const res = await register(jsonRequest("/api/auth/register", { body: customerForm }));
    expect(res.status).toBe(201); // recoverable: the registration hint was saved
    const logged = consoleError.mock.calls.map((call) => String(call[0])).join("\n");
    expect(logged).toContain("register: profile creation");
    expect(logged).toContain("P2021");
    expect(logged).not.toContain(SECRET_PASSWORD);
  });

  it("a missing service-role key is logged instead of failing silently", async () => {
    const newUser = supabaseUser({ email_confirmed_at: undefined });
    h.createServer.mockResolvedValue({ auth: { signUp: vi.fn().mockResolvedValue({ data: { user: newUser, session: null }, error: null }) } });
    h.createAdmin.mockImplementation(() => {
      throw new ConfigError("SUPABASE_SERVICE_ROLE_KEY is empty or missing (server-only secret).", ["SUPABASE_SERVICE_ROLE_KEY"]);
    });
    h.ensureProfile.mockResolvedValue({ id: newUser.id });

    const res = await register(jsonRequest("/api/auth/register", { body: customerForm }));
    expect(res.status).toBe(201);
    const logged = consoleError.mock.calls.map((call) => String(call[0])).join("\n");
    expect(logged).toContain("could not save registration hint");
    expect(logged).toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});

describe("repository hygiene: no public file may collide with an app route", () => {
  const root = path.resolve(__dirname, "..");
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full, out);
      else out.push(full);
    }
    return out;
  };

  it("does not keep the same file in both public/ and app/ (e.g. icon.svg breaks Next.js dev with a 500)", () => {
    const publicDir = path.join(root, "public");
    if (!existsSync(publicDir)) return;
    const collisions = walk(publicDir)
      .map((file) => path.relative(publicDir, file))
      .filter((rel) => existsSync(path.join(root, "app", rel)));
    expect(collisions, `delete the duplicate from public/: ${collisions.join(", ")}`).toEqual([]);
  });
});
