/**
 * Redirects from the e-mail confirmation callback must go to the PUBLIC site address.
 *
 * Behind a hosting proxy such as Render, `request.url` is the server's internal address (for
 * example http://localhost:10000), so the callback uses the configured NEXT_PUBLIC_SITE_URL.
 * These tests use an internal-looking request URL on purpose.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { supabaseUser } from "./helpers";

const h = vi.hoisted(() => ({
  auth: { exchangeCodeForSession: vi.fn(), signOut: vi.fn() },
  syncAppUser: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: h.auth }) }));
vi.mock("@/lib/auth/session", () => ({ syncAppUser: h.syncAppUser, getAuthUser: vi.fn() }));

const PUBLIC = "https://app.example.com";
const INTERNAL = "http://localhost:10000";
const internalRequest = (query = "?code=abc123") => new Request(`${INTERNAL}/auth/callback${query}`);
const appUser = (role: "CUSTOMER" | "SUPPLIER" | "ADMIN", status: "ACTIVE" | "SUSPENDED" = "ACTIVE") => ({
  id: "11111111-1111-4111-8111-111111111111", email: "jane@example.com", fullName: "Jane", phone: null, role, status, createdAt: new Date(),
});

/** Fresh module instances, so the once-only log warnings can be observed. */
async function load() {
  vi.resetModules();
  return {
    callback: (await import("@/app/auth/callback/route")).GET,
    http: await import("@/lib/security/http"),
  };
}

let warn: ReturnType<typeof vi.spyOn>;
const warnings = () => warn.mock.calls.map((c: unknown[]) => String(c[0])).join("\n");

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  h.auth.signOut.mockResolvedValue({ error: null });
  h.auth.exchangeCodeForSession.mockResolvedValue({ data: { user: supabaseUser() }, error: null });
  h.syncAppUser.mockResolvedValue(appUser("CUSTOMER"));
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  warn.mockRestore();
  vi.unstubAllEnvs();
});

describe("with NEXT_PUBLIC_SITE_URL set (behind a proxy)", () => {
  beforeEach(() => vi.stubEnv("NEXT_PUBLIC_SITE_URL", PUBLIC));

  it("redirects a missing or rejected code to the public login page, never to the internal address", async () => {
    const { callback } = await load();
    expect((await callback(internalRequest(""))).headers.get("location")).toBe(`${PUBLIC}/login?error=callback`);

    h.auth.exchangeCodeForSession.mockResolvedValue({ data: { user: null }, error: { message: "expired" } });
    expect((await callback(internalRequest())).headers.get("location")).toBe(`${PUBLIC}/login?error=callback`);
  });

  it.each([
    ["CUSTOMER", "/customer/dashboard"],
    ["SUPPLIER", "/supplier/dashboard"],
    ["ADMIN", "/admin/dashboard"],
  ] as const)("sends a confirmed %s to their dashboard on the public origin", async (role, path) => {
    h.syncAppUser.mockResolvedValue(appUser(role));
    const { callback } = await load();
    const res = await callback(internalRequest());
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`${PUBLIC}${path}`);
  });

  it("uses the public origin when the profile cannot be created, and ends the session", async () => {
    h.syncAppUser.mockResolvedValue(null);
    const { callback } = await load();
    expect((await callback(internalRequest())).headers.get("location")).toBe(`${PUBLIC}/login?error=profile`);
    expect(h.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it("uses the public origin for a suspended account, and ends the session", async () => {
    h.syncAppUser.mockResolvedValue(appUser("CUSTOMER", "SUSPENDED"));
    const { callback } = await load();
    expect((await callback(internalRequest())).headers.get("location")).toBe(`${PUBLIC}/login?error=suspended`);
    expect(h.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it("uses the public origin when the database fails after the code exchange", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    h.syncAppUser.mockRejectedValue(Object.assign(new Error("db down"), { name: "PrismaClientInitializationError" }));
    const { callback } = await load();
    expect((await callback(internalRequest())).headers.get("location")).toBe(`${PUBLIC}/login?error=unavailable`);
    expect(h.auth.signOut).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });

  it("still honours a safe ?next= path, on the public origin", async () => {
    const { callback } = await load();
    expect((await callback(internalRequest("?code=abc&next=/customer/dashboard"))).headers.get("location")).toBe(`${PUBLIC}/customer/dashboard`);
  });

  it("never lets ?next= send a user to another role's area", async () => {
    const { callback } = await load();
    expect((await callback(internalRequest("?code=abc&next=/admin/dashboard"))).headers.get("location")).toBe(`${PUBLIC}/customer/dashboard`);
  });

  it.each(["https://evil.example/steal", "//evil.example", "/\\evil.example", "javascript:alert(1)", "http://evil.example"])(
    "cannot be turned into an open redirect through ?next=%s",
    async (next) => {
      const { callback } = await load();
      const res = await callback(internalRequest(`?code=abc&next=${encodeURIComponent(next)}`));
      const target = new URL(res.headers.get("location") as string);
      expect(target.origin).toBe(PUBLIC);
      expect(target.pathname).toBe("/customer/dashboard");
    },
  );

  it("cannot be steered by the request: a hostile request URL still redirects to the configured origin", async () => {
    const { callback } = await load();
    const hostile = new Request("https://evil.example/auth/callback?code=abc123", { headers: { host: "evil.example", "x-forwarded-host": "evil.example", origin: "https://evil.example" } });
    const res = await callback(hostile);
    expect(new URL(res.headers.get("location") as string).origin).toBe(PUBLIC);
  });

  it.each([
    ["https://app.example.com/", PUBLIC],
    ["https://app.example.com/some/path?x=1#frag", PUBLIC],
    ["  https://app.example.com  ", PUBLIC],
    ["https://user:secret@app.example.com", PUBLIC],
    ["https://app.example.com:8443/base", "https://app.example.com:8443"],
    ["http://localhost:3000", "http://localhost:3000"],
  ])("reduces %j to just its origin", async (configured, expectedOrigin) => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", configured);
    const { callback } = await load();
    expect((await callback(internalRequest(""))).headers.get("location")).toBe(`${expectedOrigin}/login?error=callback`);
  });
});

describe("without a usable NEXT_PUBLIC_SITE_URL", () => {
  it.each([["unset", undefined], ["empty", ""], ["blank", "   "]])("falls back to the request origin when it is %s", async (_label, value) => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", value as string);
    if (value === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    const { callback } = await load();
    expect((await callback(internalRequest(""))).headers.get("location")).toBe(`${INTERNAL}/login?error=callback`);
    expect(warnings()).toBe(""); // not production: no warning
  });

  it.each(["not a url", "app.example.com", "javascript:alert(1)", "ftp://files.example.com", "file:///etc/passwd", "data:text/html,x"])(
    "ignores the unusable value %j, never fails with a 500, and warns without printing the value",
    async (bad) => {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", bad);
      const { callback } = await load();
      const res = await callback(internalRequest(""));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(`${INTERNAL}/login?error=callback`);
      expect(warnings()).toContain("NEXT_PUBLIC_SITE_URL is set but is not a valid http(s) URL");
      expect(warnings()).not.toContain(bad);
    },
  );

  it("warns only once per process about an unusable value", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "app.example.com");
    const { http } = await load();
    const req = internalRequest("");
    http.getPublicOrigin(req);
    http.getPublicOrigin(req);
    http.getPublicOrigin(req);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("in production, warns once that the value is missing (the cause of localhost redirects behind a proxy)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const { http } = await load();
    const req = internalRequest("");
    expect(http.getPublicOrigin(req)).toBe(INTERNAL);
    http.getPublicOrigin(req);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warnings()).toContain("NEXT_PUBLIC_SITE_URL is not set");
  });

  it("a configured value in production produces no warning", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", PUBLIC);
    const { http } = await load();
    expect(http.getPublicOrigin(internalRequest(""))).toBe(PUBLIC);
    expect(warn).not.toHaveBeenCalled();
  });
});
