import { requireApiAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { jsonError, jsonOk, readJson, sameOriginError } from "@/lib/security/http";
import { productModerationSchema } from "@/lib/validation/products";
import { writeAuditLogOrThrow } from "@/lib/security/audit";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const originError = sameOriginError(request);
  if (originError) return originError;
  const { user, response } = await requireApiAccess(["ADMIN"]);
  if (response) return response;
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError(404, "LISTING_NOT_FOUND", "Product listing not found.");
  const parsed = productModerationSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(400, "VALIDATION_ERROR", "Choose suspend or restore and provide a reason.");

  const result = await prisma.$transaction(async (tx) => {
    const old = await tx.productListing.findUnique({
      where: { id },
      select: { id: true, listingStatus: true, updatedAt: true, providerProfile: { select: { status: true } }, category: { select: { status: true } } },
    });
    if (!old) return { error: "NOT_FOUND" as const };
    if (old.listingStatus === parsed.data.status) {
      return { listing: { id: old.id, listingStatus: old.listingStatus, updatedAt: old.updatedAt }, unchanged: true };
    }
    if (parsed.data.status === "ACTIVE" && old.listingStatus !== "SUSPENDED") {
      return { error: "NOT_SUSPENDED" as const };
    }
    if (parsed.data.status === "ACTIVE" && (old.providerProfile.status !== "ACTIVE" || old.category.status !== "ACTIVE")) {
      return { error: "DEPENDENCY_INACTIVE" as const };
    }
    const updated = await tx.productListing.update({
      where: { id }, data: { listingStatus: parsed.data.status },
      select: { id: true, listingStatus: true, updatedAt: true },
    });
    await writeAuditLogOrThrow(tx, {
      userId: user.id, action: "PRODUCT_LISTING_MODERATED", resourceType: "product_listing", resourceId: id,
      metadata: { oldStatus: old.listingStatus, newStatus: updated.listingStatus, reason: parsed.data.reason }, request,
    });
    return { listing: updated };
  });
  if ("error" in result) {
    if (result.error === "NOT_FOUND") return jsonError(404, "LISTING_NOT_FOUND", "Product listing not found.");
    if (result.error === "NOT_SUSPENDED") return jsonError(409, "LISTING_NOT_SUSPENDED", "Only suspended listings can be restored by moderation.");
    return jsonError(409, "DEPENDENCY_INACTIVE", "Activate the provider and category before restoring this listing.");
  }
  return jsonOk({ listing: result.listing });
}
