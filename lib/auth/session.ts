import type { User as SupabaseUser } from "@supabase/supabase-js";
import { prisma } from "@/lib/db/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/auth/profile";
import { profileMetadataSchema } from "@/lib/validation/auth";
import { isRegistrationRole, type Role } from "@/lib/roles";
import { writeAuditLog } from "@/lib/security/audit";
import { logServerError } from "@/lib/security/log";

export type AppUser = {
  id: string; email: string; fullName: string; phone: string | null; role: Role;
  status: "ACTIVE" | "PENDING" | "SUSPENDED"; createdAt: Date;
};
const APP_USER_SELECT = { id: true, email: true, fullName: true, phone: true, role: true, status: true, createdAt: true } as const;

export async function getAuthUser(): Promise<SupabaseUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

/** Recover a failed profile write from trusted app_metadata plus validated descriptive user_metadata. */
export async function recoverProfile(authUser: SupabaseUser): Promise<AppUser | null> {
  const hint = authUser.app_metadata?.registration_type;
  if (!isRegistrationRole(hint) || !authUser.email) return null;
  const meta = profileMetadataSchema.safeParse(authUser.user_metadata ?? {});
  if (!meta.success) return null;

  const provider = hint === "SUPPLIER" &&
    meta.data.provider_display_name && meta.data.provider_kind && meta.data.provider_type && meta.data.province
    ? {
        displayName: meta.data.provider_display_name,
        providerKind: meta.data.provider_kind,
        providerType: meta.data.provider_type,
        province: meta.data.province,
      }
    : undefined;
  const supplier = hint === "SUPPLIER" && meta.data.business_name && meta.data.business_address && meta.data.location
    ? { businessName: meta.data.business_name, businessAddress: meta.data.business_address, location: meta.data.location }
    : undefined;
  if (hint === "SUPPLIER" && !provider && !supplier) return null;

  try {
    await ensureProfile({
      authUserId: authUser.id,
      email: authUser.email,
      fullName: meta.data.full_name,
      phone: meta.data.phone,
      role: hint,
      emailConfirmed: Boolean(authUser.email_confirmed_at),
      provider,
      supplier,
    });
  } catch (error) {
    logServerError("auth: profile recovery", error);
    return null;
  }
  await writeAuditLog({ userId: authUser.id, action: "PROFILE_RECOVERED", resourceType: "user", resourceId: authUser.id });
  return prisma.user.findUnique({ where: { id: authUser.id }, select: APP_USER_SELECT });
}

export async function syncAppUser(authUser: SupabaseUser): Promise<AppUser | null> {
  const found = await prisma.user.findUnique({ where: { id: authUser.id }, select: APP_USER_SELECT });
  if (!found) return recoverProfile(authUser);
  if (found.status === "PENDING" && authUser.email_confirmed_at) {
    return prisma.user.update({ where: { id: found.id }, data: { status: "ACTIVE" }, select: APP_USER_SELECT });
  }
  return found;
}
export async function getAppUser(): Promise<AppUser | null> {
  const authUser = await getAuthUser();
  if (!authUser) return null;
  return syncAppUser(authUser);
}
