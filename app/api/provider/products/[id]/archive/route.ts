import { requireApiAccess } from "@/lib/auth/guards";
import { getOwnedActiveProvider } from "@/lib/auth/provider-access";
import { prisma } from "@/lib/db/prisma";
import { jsonError, jsonOk, sameOriginError } from "@/lib/security/http";
import { writeAuditLogOrThrow } from "@/lib/security/audit";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const originError = sameOriginError(request);
  if (originError) return originError;
  const { user, response } = await requireApiAccess();
  if (response) return response;
  const provider = await getOwnedActiveProvider(user);
  if (!provider) return jsonError(403, "ACTIVE_PROVIDER_REQUIRED", "An active provider profile is required.");
  if (provider.providerType === "SERVICES") return jsonError(403, "PRODUCT_PROVIDER_REQUIRED", "Your provider profile is not enabled to list products.");
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError(404, "LISTING_NOT_FOUND", "Product listing not found.");
  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.productListing.findFirst({
      where: { id, providerProfileId: provider.id },
      select: { id: true, listingStatus: true },
    });
    if (!current) return { error: "NOT_FOUND" as const };
    if (current.listingStatus === "ARCHIVED") return { listing: current };
    if (current.listingStatus === "SUSPENDED") return { error: "LOCKED" as const };
    const changed = await tx.productListing.updateMany({
      where: { id, providerProfileId: provider.id, listingStatus: { in: ["DRAFT", "ACTIVE"] } },
      data: { listingStatus: "ARCHIVED" },
    });
    if (changed.count !== 1) return { error: "LOCKED" as const };
    await writeAuditLogOrThrow(tx, { userId: user.id, action: "PRODUCT_LISTING_ARCHIVED", resourceType: "product_listing", resourceId: id, request });
    return { listing: { id, listingStatus: "ARCHIVED" as const } };
  });
  if ("error" in result) {
    if (result.error === "NOT_FOUND") return jsonError(404, "LISTING_NOT_FOUND", "Product listing not found.");
    return jsonError(409, "LISTING_LOCKED", "A suspended listing cannot be archived by its provider.");
  }
  return jsonOk({ listing: result.listing });
}
