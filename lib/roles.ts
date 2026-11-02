/**
 * Database roles remain backward-compatible. SUPPLIER is the legacy database role used for all
 * provider accounts (individual and business); providerKind/providerType live on ProviderProfile.
 * CUSTOMER remains only for pre-existing accounts and is no longer publicly registerable.
 */
export const ROLES = ["CUSTOMER", "SUPPLIER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];
export const PUBLIC_REGISTRATION_TYPES = ["INDIVIDUAL_PROVIDER", "BUSINESS_PROVIDER"] as const;
export type RegistrationType = (typeof PUBLIC_REGISTRATION_TYPES)[number];
export const LEGACY_REGISTRATION_ROLES = ["CUSTOMER", "SUPPLIER"] as const;
export type RegistrationRole = (typeof LEGACY_REGISTRATION_ROLES)[number];

export const ROLE_HOME: Record<Role, string> = {
  CUSTOMER: "/products",
  SUPPLIER: "/supplier/dashboard",
  ADMIN: "/admin/dashboard",
};
export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
export function isRegistrationRole(value: unknown): value is RegistrationRole {
  return typeof value === "string" && (LEGACY_REGISTRATION_ROLES as readonly string[]).includes(value);
}
export function roleForPath(pathname: string): Role | null {
  if (pathname === "/customer" || pathname.startsWith("/customer/")) return "CUSTOMER";
  if (pathname === "/supplier" || pathname.startsWith("/supplier/")) return "SUPPLIER";
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "ADMIN";
  return null;
}
export function isSafeRelativePath(path: unknown): path is string {
  if (typeof path !== "string" || path.length === 0 || path.length > 512) return false;
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return false;
  if (/[\u0000-\u001f\\]/.test(path)) return false;
  return true;
}
export function postLoginPath(role: Role, requested: unknown): string {
  if (isSafeRelativePath(requested)) {
    const area = roleForPath(requested.split("?")[0] ?? "");
    // Customer workspaces are retired. Legacy CUSTOMER users return to public browsing.
    if (area === "CUSTOMER") return ROLE_HOME[role];
    if (area === null || area === role) return requested;
  }
  return ROLE_HOME[role];
}
