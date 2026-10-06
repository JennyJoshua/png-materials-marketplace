import { redirect } from "next/navigation";
import type { NextResponse } from "next/server";
import { getAuthUser, syncAppUser, type AppUser } from "@/lib/auth/session";
import { ROLE_HOME, type Role } from "@/lib/roles";
import { jsonError } from "@/lib/security/http";

export type AccessResult =
  | { ok: true; user: AppUser }
  | { ok: false; reason: "unauthenticated" | "no_profile" | "suspended" }
  | { ok: false; reason: "forbidden"; user: AppUser };

/**
 * The single server-side authorization decision used by pages AND API routes:
 *   1. verified identity (Supabase getUser)
 *   2. authoritative application role/status from the database
 *   3. role check against the required roles
 * Middleware is only a first line of defence; this function is the real gate.
 */
export async function resolveAccess(allowedRoles?: readonly Role[]): Promise<AccessResult> {
  const authUser = await getAuthUser();
  if (!authUser) return { ok: false, reason: "unauthenticated" };

  const user = await syncAppUser(authUser);
  if (!user) return { ok: false, reason: "no_profile" };
  if (user.status === "SUSPENDED") return { ok: false, reason: "suspended" };
  if (allowedRoles && !allowedRoles.includes(user.role)) return { ok: false, reason: "forbidden", user };
  return { ok: true, user };
}

/** For Server Component pages: returns the user or redirects. Call it in EVERY protected page. */
export async function requirePageRole(role: Role, currentPath: string): Promise<AppUser> {
  const access = await resolveAccess([role]);
  if (access.ok) return access.user;
  switch (access.reason) {
    case "unauthenticated":
      redirect(`/login?next=${encodeURIComponent(currentPath)}`);
    case "forbidden":
      redirect(ROLE_HOME[access.user.role]);
    case "suspended":
      redirect("/login?error=suspended");
    default:
      redirect("/login?error=profile");
  }
}

/** For Route Handlers: returns the user, or a ready-made error response. */
export async function requireApiAccess(
  allowedRoles?: readonly Role[],
): Promise<{ user: AppUser; response?: undefined } | { user?: undefined; response: NextResponse }> {
  const access = await resolveAccess(allowedRoles);
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
