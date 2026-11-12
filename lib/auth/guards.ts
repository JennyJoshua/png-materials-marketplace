import { redirect } from "next/navigation";
import type { NextResponse } from "next/server";
import { getAuthUser, syncAppUser, type AppUser } from "@/lib/auth/session";
import { ROLE_HOME, type Role } from "@/lib/roles";
import { configErrorResponse, databaseUnavailableResponse, jsonError } from "@/lib/security/http";
import { ConfigError } from "@/lib/env";
import { isDatabaseError } from "@/lib/db/errors";
import { logServerError } from "@/lib/security/log";

export type AccessResult =
  | { ok: true; user: AppUser }
  | { ok: false; reason: "unauthenticated" | "no_profile" | "suspended" }
  | { ok: false; reason: "forbidden"; user: AppUser };

export async function resolveAccess(allowedRoles?: readonly Role[]): Promise<AccessResult> {
  const authUser = await getAuthUser();
  if (!authUser) return { ok: false, reason: "unauthenticated" };
  const user = await syncAppUser(authUser);
  if (!user) return { ok: false, reason: "no_profile" };
  if (user.status === "SUSPENDED") return { ok: false, reason: "suspended" };
  if (allowedRoles && !allowedRoles.includes(user.role)) return { ok: false, reason: "forbidden", user };
  return { ok: true, user };
}

export async function requirePageRole(role: Role, currentPath: string): Promise<AppUser> {
  const access = await resolveAccess([role]);
  const loginPath = role === "ADMIN" ? "/admin/login" : "/login";
  switch (access.ok ? "ok" : access.reason) {
    case "ok": return access.user;
    case "unauthenticated":
      redirect(`${loginPath}?next=${encodeURIComponent(currentPath)}`);
    case "forbidden":
      redirect(ROLE_HOME[access.user.role]);
    case "suspended":
      redirect(`${loginPath}?error=suspended`);
    default:
      redirect(`${loginPath}?error=profile`);
  }
}

export async function requireApiAccess(
  allowedRoles?: readonly Role[],
): Promise<{ user: AppUser; response?: undefined } | { user?: undefined; response: NextResponse }> {
  let access: AccessResult;
  try {
    access = await resolveAccess(allowedRoles);
  } catch (error) {
    if (error instanceof ConfigError) {
      logServerError("api access: configuration", error);
      return { response: configErrorResponse(error) };
    }
    if (isDatabaseError(error)) {
      logServerError("api access: database", error);
      return { response: databaseUnavailableResponse() };
    }
    throw error;
  }
  if (access.ok) return { user: access.user };
  switch (access.reason) {
    case "unauthenticated":
      return { response: jsonError(401, "UNAUTHENTICATED", "Sign in to continue.") };
    case "forbidden":
      return { response: jsonError(403, "FORBIDDEN", "You do not have access to this resource.") };
    case "suspended":
      return { response: jsonError(403, "ACCOUNT_SUSPENDED", "This account is suspended.") };
    default:
      return { response: jsonError(403, "PROFILE_INCOMPLETE", "Your account setup is incomplete.") };
  }
}
