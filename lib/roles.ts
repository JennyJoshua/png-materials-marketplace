/**
 * Application roles. The AUTHORITATIVE role of a user is `users.role` in the application database
 * (see lib/auth/session.ts). Nothing in this file reads a role from the client or from Supabase
 * user_metadata.
 */
export const ROLES = ["CUSTOMER", "SUPPLIER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

/** Roles that can be chosen during PUBLIC registration. ADMIN is deliberately absent. */
export const PUBLIC_REGISTRATION_ROLES = ["CUSTOMER", "SUPPLIER"] as const;
export type RegistrationRole = (typeof PUBLIC_REGISTRATION_ROLES)[number];

export const ROLE_HOME: Record<Role, string> = {
  CUSTOMER: "/customer/dashboard",
  SUPPLIER: "/supplier/dashboard",
  ADMIN: "/admin/dashboard",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function isRegistrationRole(value: unknown): value is RegistrationRole {
  return typeof value === "string" && (PUBLIC_REGISTRATION_ROLES as readonly string[]).includes(value);
}

/** Which role an application area belongs to, or null for public paths. */
export function roleForPath(pathname: string): Role | null {
  if (pathname === "/customer" || pathname.startsWith("/customer/")) return "CUSTOMER";
  if (pathname === "/supplier" || pathname.startsWith("/supplier/")) return "SUPPLIER";
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "ADMIN";
  return null;
}

/** Only same-site relative paths are accepted as post-login redirect targets (no open redirects). */
export function isSafeRelativePath(path: unknown): path is string {
  if (typeof path !== "string" || path.length === 0 || path.length > 512) return false;
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return false;
  if (/[\u0000-\u001f\\]/.test(path)) return false;
  return true;
}

/** Where to send a freshly authenticated user: the requested path if they may open it, else home. */
export function postLoginPath(role: Role, requested: unknown): string {
  if (isSafeRelativePath(requested)) {
    const area = roleForPath(requested.split("?")[0] ?? "");
    if (area === null || area === role) return requested;
  }
  return ROLE_HOME[role];
}
