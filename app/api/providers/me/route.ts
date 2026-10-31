import { requireApiAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { jsonError, jsonOk, readJson } from "@/lib/security/http";
import { providerProfileSchema } from "@/lib/validation/provider";
import { writeAuditLogOrThrow } from "@/lib/security/audit";
import { Prisma } from "@prisma/client";

const fields = {
  id: true, displayName: true, providerKind: true, providerType: true, description: true,
  phone: true, publicEmail: true, address: true, province: true, district: true,
  townOrArea: true, businessRegistrationNumber: true, websiteUrl: true, logoUrl: true,
  deliveryAvailable: true, pickupAvailable: true, status: true, verificationLevel: true,
  verifiedAt: true, createdAt: true, updatedAt: true,
} as const;

export async function GET() {
  const { user, response } = await requireApiAccess();
  if (response) return response;
  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    select: fields,
  });
  return jsonOk({ profile });
}

export async function POST(request: Request) {
  const { user, response } = await requireApiAccess();
  if (response) return response;
  if (user.status !== "ACTIVE") {
    return jsonError(403, "ACCOUNT_NOT_ACTIVE", "Your account must be active before creating a provider profile.");
  }
  const parsed = providerProfileSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(400, "VALIDATION_ERROR", "Check the provider profile fields.");

  try {
    const profile = await prisma.$transaction(async (tx) => {
      const created = await tx.providerProfile.create({
        data: { ...parsed.data, userId: user.id, status: "PENDING_REVIEW" },
        select: fields,
      });
      await writeAuditLogOrThrow(tx, {
        userId: user.id,
        action: "PROVIDER_PROFILE_CREATED",
        resourceType: "provider_profile",
        resourceId: created.id,
        metadata: { status: created.status, providerKind: created.providerKind, providerType: created.providerType },
        request,
      });
      return created;
    });
    return jsonOk({ profile }, 201);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError(409, "PROFILE_EXISTS", "You already have a provider profile. Edit the existing profile instead.");
    }
    throw error;
  }
}

export async function PATCH(request: Request) {
  const { user, response } = await requireApiAccess();
  if (response) return response;
  const parsed = providerProfileSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(400, "VALIDATION_ERROR", "Check the provider profile fields.");

  const result = await prisma.$transaction(async (tx) => {
    const old = await tx.providerProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, status: true },
    });
    if (!old) return { error: "PROFILE_NOT_FOUND" as const };
    if (old.status === "SUSPENDED") return { error: "PROVIDER_SUSPENDED" as const };

    const nextStatus = old.status === "ACTIVE" ? "PENDING_REVIEW" : old.status;
    const profile = await tx.providerProfile.update({
      where: { userId: user.id },
      data: { ...parsed.data, status: nextStatus },
      select: fields,
    });
    await writeAuditLogOrThrow(tx, {
      userId: user.id,
      action: "PROVIDER_PROFILE_UPDATED",
      resourceType: "provider_profile",
      resourceId: profile.id,
      metadata: { previousStatus: old.status, status: profile.status, reviewRequired: old.status === "ACTIVE" },
      request,
    });
    return { profile };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  if ("error" in result) {
    if (result.error === "PROFILE_NOT_FOUND") return jsonError(404, "PROFILE_NOT_FOUND", "Create your provider profile first.");
    return jsonError(403, "PROVIDER_SUSPENDED", "This provider profile is suspended. Contact an administrator.");
  }
  return jsonOk({ profile: result.profile });
}
