import type { User as SupabaseUser } from "@supabase/supabase-js";
import { prisma } from "@/lib/db/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/auth/profile";
import { profileMetadataSchema } from "@/lib/validation/auth";
import { isRegistrationRole, type Role } from "@/lib/roles";
import { writeAuditLog } from "@/lib/security/audit";

/** Safe-to-return application user. Never contains credentials or Supabase metadata. */
export type AppUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  status: "ACTIVE" | "PENDING" | "SUSPENDED";
  createdAt: Date;
};

const APP_USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  role: true,
  status: true,
  createdAt: true,
} as const;

/**
 * Verified Supabase identity. Uses getUser(), which validates the token with Supabase Auth.
 * getSession() is NOT used for server-side identity decisions (it only reads the cookie).
 */
export async function getAuthUser(): Promise<SupabaseUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

/**
 * Rebuilds a missing application profile (Auth user exists but profile creation failed earlier).
 *  - the requested role comes ONLY from app_metadata.registration_type, which only trusted server
 *    code (service-role key) can write; user_metadata.role and client input are never consulted;
 *  - ADMIN can never be recovered this way;
 *  - user_metadata is used for descriptive profile data (name, phone, business details) only.
 */
export async function recoverProfile(authUser: SupabaseUser): Promise<AppUser | null> {
  const hint = authUser.app_metadata?.registration_type;
  if (!isRegistrationRole(hint) || !authUser.email) return null;

  const meta = profileMetadataSchema.safeParse(authUser.user_metadata ?? {});
  if (!meta.success) return null;

  const supplier =
    hint === "SUPPLIER" && meta.data.business_name && meta.data.business_address && meta.data.location
      ? {
          businessName: meta.data.business_name,
          businessAddress: meta.data.business_address,
          location: meta.data.location,
        }
      : undefined;
  if (hint === "SUPPLIER" && !supplier) return null;

  try {
    await ensureProfile({
      authUserId: authUser.id,
      email: authUser.email,
      fullName: meta.data.full_name,
      phone: meta.data.phone,
      role: hint,
      emailConfirmed: Boolean(authUser.email_confirmed_at),
      supplier,
    });
  } catch {
    return null;
  }
  await writeAuditLog({ userId: authUser.id, action: "PROFILE_RECOVERED", resourceType: "user", resourceId: authUser.id });
  return prisma.user.findUnique({ where: { id: authUser.id }, select: APP_USER_SELECT });
}

/**
 * Loads the application user for a verified Supabase identity. The DATABASE row is authoritative
 * for role and status. Also activates a PENDING user once their e-mail is confirmed.
 */
export async function syncAppUser(authUser: SupabaseUser): Promise<AppUser | null> {
  const found = await prisma.user.findUnique({ where: { id: authUser.id }, select: APP_USER_SELECT });
  if (!found) return recoverProfile(authUser);
  if (found.status === "PENDING" && authUser.email_confirmed_at) {
    return prisma.user.update({ where: { id: found.id }, data: { status: "ACTIVE" }, select: APP_USER_SELECT });
  }
  return found;
}

/** Verified identity + authoritative application user, or null when signed out / no profile. */
export async function getAppUser(): Promise<AppUser | null> {
  const authUser = await getAuthUser();
  if (!authUser) return null;
  return syncAppUser(authUser);
}
