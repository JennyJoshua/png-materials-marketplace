import { beforeEach, describe, expect, it, vi } from "vitest";
import { customerForm, jsonRequest, supabaseUser, supplierForm } from "./helpers";

const h = vi.hoisted(() => ({
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    getUser: vi.fn(),
  },
  admin: { updateUserById: vi.fn() },
  ensureProfile: vi.fn(),
  syncAppUser: vi.fn(),
  getAuthUser: vi.fn(),
  userUpdate: vi.fn(),
  audit: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: h.auth }) }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: () => ({ auth: { admin: h.admin } }) }));
vi.mock("@/lib/auth/profile", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/profile")>("@/lib/auth/profile");
  return { ...actual, ensureProfile: h.ensureProfile };
});
vi.mock("@/lib/auth/session", () => ({ syncAppUser: h.syncAppUser, getAuthUser: h.getAuthUser }));
vi.mock("@/lib/db/prisma", () => ({ prisma: { user: { update: h.userUpdate } } }));
vi.mock("@/lib/security/audit", () => ({ writeAuditLog: h.audit }));

import { POST as register } from "@/app/api/auth/register/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as callback } from "@/app/auth/callback/route";
import { loginIpLimiter, loginLimiter, registerLimiter } from "@/lib/security/rate-limit";

const newAuthUser = supabaseUser({ email_confirmed_at: undefined });
const appUser = (role: string, status = "ACTIVE") => ({
  id: "11111111-1111-4111-8111-111111111111",
  email: "jane@example.com",
  fullName: "Jane Kila",
  phone: null,
  role,
  status,
  createdAt: new Date(),
});

beforeEach(() => {
  vi.clearAllMocks();
  registerLimiter.reset();
  loginLimiter.reset();
  loginIpLimiter.reset();
  h.auth.signUp.mockResolvedValue({ data: { user: newAuthUser, session: null }, error: null });
  h.auth.signOut.mockResolvedValue({ error: null });
  h.admin.updateUserById.mockResolvedValue({ error: null });
  h.ensureProfile.mockResolvedValue({ id: newAuthUser.id });
  h.userUpdate.mockResolvedValue({});
});

describe("POST /api/auth/register", () => {
  it("registers a customer; Supabase Auth owns the password; e-mail confirmation (no session) is handled", async () => {
    const res = await register(jsonRequest("/api/auth/register", { body: customerForm }));
    expect(res.status).toBe(201);
    expect((await res.json()).data).toEqual({ needsEmailConfirmation: true });

    const signUpArgs = h.auth.signUp.mock.calls[0]![0];
    expect(signUpArgs.email).toBe("jane@example.com");
    expect(signUpArgs.password).toBe(customerForm.password); // handed to Supabase Auth only
    expect(JSON.stringify(signUpArgs.options.data)).not.toMatch(/role|password/i);

    expect(h.admin.updateUserById).toHaveBeenCalledWith(newAuthUser.id, { app_metadata: { registration_type: "CUSTOMER" } });
    expect(h.ensureProfile).toHaveBeenCalledWith(
      expect.objectContaining({ authUserId: newAuthUser.id, role: "CUSTOMER", emailConfirmed: false }),
    );
    expect(h.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "USER_REGISTERED" }));
  });

  it("works when Supabase returns a session (confirmation disabled) and points to the dashboard", async () => {
    h.auth.signUp.mockResolvedValue({
      data: { user: supabaseUser(), session: { access_token: "x" } },
      error: null,
    });
    const res = await register(jsonRequest("/api/auth/register", { body: customerForm }));
    expect((await res.json()).data).toEqual({ needsEmailConfirmation: false, redirectTo: "/customer/dashboard" });
    expect(h.ensureProfile).toHaveBeenCalledWith(expect.objectContaining({ emailConfirmed: true }));
  });

  it("registers a supplier with business details", async () => {
    const res = await register(jsonRequest("/api/auth/register", { body: supplierForm }));
    expect(res.status).toBe(201);
    expect(h.admin.updateUserById).toHaveBeenCalledWith(expect.anything(), { app_metadata: { registration_type: "SUPPLIER" } });
    expect(h.ensureProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "SUPPLIER",
        supplier: { businessName: "Highlands Hardware", businessAddress: "Section 12, Kagamuga Road", location: "Mount Hagen" },
      }),
    );
  });

  it("rejects a client-supplied role field and creates nothing", async () => {
    const res = await register(jsonRequest("/api/auth/register", { body: { ...customerForm, role: "ADMIN" } }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
    expect(h.auth.signUp).not.toHaveBeenCalled();
    expect(h.ensureProfile).not.toHaveBeenCalled();
  });

  it("does not allow ADMIN as an account type", async () => {
    const res = await register(jsonRequest("/api/auth/register", { body: { ...customerForm, accountType: "ADMIN" } }));
    expect(res.status).toBe(400);
    expect(h.auth.signUp).not.toHaveBeenCalled();
  });

  it("returns field errors for mismatched passwords", async () => {
    const res = await register(jsonRequest("/api/auth/register", { body: { ...customerForm, confirmPassword: "different" } }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.fields.confirmPassword).toBe("Passwords do not match.");
  });

  it("rejects cross-origin and origin-less requests (CSRF)", async () => {
    const cross = await register(jsonRequest("/api/auth/register", { body: customerForm, origin: "https://evil.example" }));
    expect(cross.status).toBe(403);
    const none = await register(jsonRequest("/api/auth/register", { body: customerForm, origin: null }));
    expect(none.status).toBe(403);
    expect(h.auth.signUp).not.toHaveBeenCalled();
  });

  it("answers an already-registered e-mail exactly like a new one and creates no profile", async () => {
    h.auth.signUp.mockResolvedValue({ data: { user: supabaseUser({ identities: [] }), session: null }, error: null });
    const res = await register(jsonRequest("/api/auth/register", { body: customerForm }));
    expect(res.status).toBe(201);
    expect((await res.json()).data).toEqual({ needsEmailConfirmation: true });
    expect(h.ensureProfile).not.toHaveBeenCalled();
    expect(h.admin.updateUserById).not.toHaveBeenCalled();
  });

  it("returns a generic error (no Supabase internals) when sign-up fails", async () => {
    h.auth.signUp.mockResolvedValue({ data: { user: null, session: null }, error: { code: "unexpected_failure", message: "db password=hunter2 leaked" } });
    const res = await register(jsonRequest("/api/auth/register", { body: customerForm }));
    const text = JSON.stringify(await res.json());
    expect(res.status).toBe(400);
    expect(text).not.toContain("hunter2");
  });

  it("Auth user created but profile creation fails: still succeeds, failure is audited, sign-in will recover", async () => {
    h.ensureProfile.mockRejectedValue(new Error("db down"));
    const res = await register(jsonRequest("/api/auth/register", { body: customerForm }));
    expect(res.status).toBe(201);
    expect(h.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "PROFILE_CREATE_FAILED" }));
    expect(h.audit).not.toHaveBeenCalledWith(expect.objectContaining({ action: "USER_REGISTERED" }));
  });

  it("fails loudly when neither the profile nor the recovery hint could be saved", async () => {
    h.ensureProfile.mockRejectedValue(new Error("db down"));
    h.admin.updateUserById.mockResolvedValue({ error: { message: "nope" } });
    const res = await register(jsonRequest("/api/auth/register", { body: customerForm }));
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("SETUP_INCOMPLETE");
  });

  it("rate-limits repeated sign-ups per IP", async () => {
    let last: Response | undefined;
    for (let i = 0; i < 6; i++) {
      last = await register(jsonRequest("/api/auth/register", { body: customerForm, headers: { "x-forwarded-for": "203.0.113.9" } }));
    }
    expect(last!.status).toBe(429);
    expect(last!.headers.get("retry-after")).toBeTruthy();
  });

  it("never echoes the password or secrets in the response", async () => {
    const res = await register(jsonRequest("/api/auth/register", { body: customerForm }));
    const text = await res.text();
    expect(text).not.toContain(customerForm.password);
    expect(text).not.toContain("service-role");
  });
});

describe("POST /api/auth/login", () => {
  const goodLogin = { email: "Jane@Example.com", password: "correct horse 42" };

  it("rejects bad credentials with one generic message and does not touch the profile", async () => {
    h.auth.signInWithPassword.mockResolvedValue({ data: { user: null }, error: { code: "invalid_credentials", message: "Invalid login credentials" } });
    const res = await login(jsonRequest("/api/auth/login", { body: goodLogin }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toEqual({ code: "INVALID_CREDENTIALS", message: "Invalid email or password." });
    expect(h.syncAppUser).not.toHaveBeenCalled();
    expect(h.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "USER_LOGIN_FAILED" }));
  });

  it("signs a customer in and returns their role home", async () => {
    h.auth.signInWithPassword.mockResolvedValue({ data: { user: supabaseUser() }, error: null });
    h.syncAppUser.mockResolvedValue(appUser("CUSTOMER"));
    const res = await login(jsonRequest("/api/auth/login", { body: goodLogin }));
    expect(res.status).toBe(200);
    expect((await res.json()).data.redirectTo).toBe("/customer/dashboard");
    expect(h.auth.signInWithPassword).toHaveBeenCalledWith({ email: "jane@example.com", password: "correct horse 42" });
    expect(h.userUpdate).toHaveBeenCalled();
    expect(h.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "USER_LOGIN" }));
  });

  it.each([
    ["SUPPLIER", "/supplier/dashboard"],
    ["ADMIN", "/admin/dashboard"],
  ])("sends %s users to %s", async (role, home) => {
    h.auth.signInWithPassword.mockResolvedValue({ data: { user: supabaseUser() }, error: null });
    h.syncAppUser.mockResolvedValue(appUser(role));
    const res = await login(jsonRequest("/api/auth/login", { body: goodLogin }));
    expect((await res.json()).data.redirectTo).toBe(home);
  });

  it("honours a safe same-area next path but never an external or other-role path", async () => {
    h.auth.signInWithPassword.mockResolvedValue({ data: { user: supabaseUser() }, error: null });
    h.syncAppUser.mockResolvedValue(appUser("CUSTOMER"));
    const go = async (next: string) =>
      (await (await login(jsonRequest("/api/auth/login", { body: { ...goodLogin, next } }))).json()).data.redirectTo;
    expect(await go("/customer/dashboard")).toBe("/customer/dashboard");
    expect(await go("//evil.example")).toBe("/customer/dashboard");
    expect(await go("https://evil.example")).toBe("/customer/dashboard");
    expect(await go("/admin/dashboard")).toBe("/customer/dashboard");
  });

  it("blocks suspended accounts and ends the session", async () => {
    h.auth.signInWithPassword.mockResolvedValue({ data: { user: supabaseUser() }, error: null });
    h.syncAppUser.mockResolvedValue(appUser("CUSTOMER", "SUSPENDED"));
    const res = await login(jsonRequest("/api/auth/login", { body: goodLogin }));
    expect(res.status).toBe(403);
    expect(h.auth.signOut).toHaveBeenCalled();
  });

  it("ends the session when the profile is missing and cannot be recovered", async () => {
    h.auth.signInWithPassword.mockResolvedValue({ data: { user: supabaseUser() }, error: null });
    h.syncAppUser.mockResolvedValue(null);
    const res = await login(jsonRequest("/api/auth/login", { body: goodLogin }));
    expect(res.status).toBe(409);
    expect(h.auth.signOut).toHaveBeenCalled();
  });

  it("tells an unconfirmed user to confirm their e-mail", async () => {
    h.auth.signInWithPassword.mockResolvedValue({ data: { user: null }, error: { code: "email_not_confirmed", message: "x" } });
    const res = await login(jsonRequest("/api/auth/login", { body: goodLogin }));
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("EMAIL_NOT_CONFIRMED");
  });

  it("rate-limits repeated attempts for one e-mail", async () => {
    h.auth.signInWithPassword.mockResolvedValue({ data: { user: null }, error: { code: "invalid_credentials", message: "x" } });
    let last: Response | undefined;
    for (let i = 0; i < 11; i++) last = await login(jsonRequest("/api/auth/login", { body: goodLogin }));
    expect(last!.status).toBe(429);
  });

  it("rejects cross-origin requests and unknown fields (a role cannot be smuggled in)", async () => {
    expect((await login(jsonRequest("/api/auth/login", { body: goodLogin, origin: "https://evil.example" }))).status).toBe(403);
    expect((await login(jsonRequest("/api/auth/login", { body: { ...goodLogin, role: "ADMIN" } }))).status).toBe(400);
    expect(h.auth.signInWithPassword).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/logout", () => {
  it("signs out, audits, and redirects form posts to /login", async () => {
    h.getAuthUser.mockResolvedValue(supabaseUser());
    const res = await logout(jsonRequest("/api/auth/logout", {}));
    expect(h.auth.signOut).toHaveBeenCalled();
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://app.test/login");
    expect(h.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "USER_LOGOUT" }));
  });

  it("returns JSON for fetch callers", async () => {
    h.getAuthUser.mockResolvedValue(null);
    const res = await logout(jsonRequest("/api/auth/logout", { headers: { accept: "application/json" } }));
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({ signedOut: true });
  });

  it("rejects cross-origin logout requests", async () => {
    const res = await logout(jsonRequest("/api/auth/logout", { origin: "https://evil.example" }));
    expect(res.status).toBe(403);
    expect(h.auth.signOut).not.toHaveBeenCalled();
  });
});

describe("GET /auth/callback (e-mail confirmation)", () => {
  const cb = (query: string) => callback(new Request(`https://app.test/auth/callback${query}`));

  it("redirects to login when the code is missing or invalid", async () => {
    expect((await cb("")).headers.get("location")).toBe("https://app.test/login?error=callback");
    h.auth.exchangeCodeForSession.mockResolvedValue({ data: { user: null }, error: { message: "bad" } });
    expect((await cb("?code=bad")).headers.get("location")).toBe("https://app.test/login?error=callback");
  });

  it("creates/activates the profile and sends the user to their dashboard", async () => {
    h.auth.exchangeCodeForSession.mockResolvedValue({ data: { user: supabaseUser() }, error: null });
    h.syncAppUser.mockResolvedValue(appUser("SUPPLIER"));
    expect((await cb("?code=ok")).headers.get("location")).toBe("https://app.test/supplier/dashboard");
  });

  it("signs out when the profile cannot be created", async () => {
    h.auth.exchangeCodeForSession.mockResolvedValue({ data: { user: supabaseUser() }, error: null });
    h.syncAppUser.mockResolvedValue(null);
    const res = await cb("?code=ok");
    expect(res.headers.get("location")).toBe("https://app.test/login?error=profile");
    expect(h.auth.signOut).toHaveBeenCalled();
  });
});
