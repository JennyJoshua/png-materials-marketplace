import { requireApiAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { jsonError, jsonOk, readJson } from "@/lib/security/http";
import { providerAdminActionSchema } from "@/lib/validation/provider";
import { writeAuditLogOrThrow } from "@/lib/security/audit";
import { Prisma } from "@prisma/client";

export async function GET() {
  const { response } = await requireApiAccess(["ADMIN"]);
  if (response) return response;
  const providers = await prisma.providerProfile.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, userId: true, displayName: true, providerKind: true, providerType: true,
      province: true, district: true, townOrArea: true, status: true, verificationLevel: true,
      phone: true, publicEmail: true, createdAt: true,
      user: { select: { fullName: true, email: true, role: true, status: true } },
    },
  });
  return jsonOk({ providers });
}

export async function PATCH(request: Request) {
  const { user, response } = await requireApiAccess(["ADMIN"]);
  if (response) return response;
  const body = await readJson(request);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid request.");
  }
  const { providerId, ...action } = body as Record<string, unknown>;
  if (typeof providerId !== "string" || !/^[0-9a-f-]{36}$/i.test(providerId)) {
    return jsonError(400, "VALIDATION_ERROR", "A valid provider ID is required.");
  }
  const parsed = providerAdminActionSchema.safeParse(action);
  if (!parsed.success) return jsonError(400, "VALIDATION_ERROR", "Choose a valid status or verification level.");

  const result = await prisma.$transaction(async (tx) => {
    const old = await tx.providerProfile.findUnique({
      where: { id: providerId },
      select: { id: true, userId: true, status: true, verificationLevel: true },
    });
    if (!old) return { error: "PROFILE_NOT_FOUND" as const };
    if (old.userId === user.id) return { error: "SELF_REVIEW_NOT_ALLOWED" as const };

    const data: Record<string, unknown> = {};
    if (parsed.data.status) data.status = parsed.data.status;
    if (parsed.data.verificationLevel) {
      data.verificationLevel = parsed.data.verificationLevel;
      data.verifiedAt = parsed.data.verificationLevel === "UNVERIFIED" ? null : new Date();
      data.verifiedByUserId = parsed.data.verificationLevel === "UNVERIFIED" ? null : user.id;
    }

    const updated = await tx.providerProfile.update({
      where: { id: providerId },
      data,
      select: { id: true, status: true, verificationLevel: true },
    });
    if (parsed.data.status && parsed.data.status !== old.status) {
      await writeAuditLogOrThrow(tx, {
        userId: user.id, action: "PROVIDER_STATUS_CHANGED", resourceType: "provider_profile",
        resourceId: old.id, metadata: { oldStatus: old.status, newStatus: updated.status }, request,
      });
    }
    if (parsed.data.verificationLevel && parsed.data.verificationLevel !== old.verificationLevel) {
      await writeAuditLogOrThrow(tx, {
        userId: user.id, action: "PROVIDER_VERIFICATION_CHANGED", resourceType: "provider_profile",
        resourceId: old.id, metadata: { oldLevel: old.verificationLevel, newLevel: updated.verificationLevel }, request,
      });
    }
    return { provider: updated };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  if ("error" in result) {
    if (result.error === "PROFILE_NOT_FOUND") return jsonError(404, "PROFILE_NOT_FOUND", "Provider profile not found.");
    return jsonError(403, "SELF_REVIEW_NOT_ALLOWED", "Administrators cannot change their own provider profile status or verification.");
  }
  return jsonOk({ provider: result.provider });
}
