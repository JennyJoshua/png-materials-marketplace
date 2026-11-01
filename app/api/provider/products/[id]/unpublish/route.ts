import { requireApiAccess } from "@/lib/auth/guards";
import { getOwnedActiveProvider } from "@/lib/auth/provider-access";
import { prisma } from "@/lib/db/prisma";
import { jsonError, jsonOk } from "@/lib/security/http";
import { writeAuditLogOrThrow } from "@/lib/security/audit";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiAccess();
  if (response) return response;
  const provider = await getOwnedActiveProvider(user);
  if (!provider) return jsonError(403, "ACTIVE_PROVIDER_REQUIRED", "An active provider profile is required.");
  if (provider.providerType === "SERVICES") return jsonError(403, "PRODUCT_PROVIDER_REQUIRED", "Your provider profile is not enabled to list products.");
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError(404, "LISTING_NOT_FOUND", "Product listing not found.");
  const listing = await prisma.productListing.findFirst({ where: { id, providerProfileId: provider.id }, select: { id: true, listingStatus: true } });
  if (!listing) return jsonError(404, "LISTING_NOT_FOUND", "Product listing not found.");
  if (listing.listingStatus !== "ACTIVE") return jsonError(409, "NOT_PUBLISHED", "Only active listings can be unpublished.");
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.productListing.update({ where: { id }, data: { listingStatus: "DRAFT" }, select: { id: true, listingStatus: true } });
    await writeAuditLogOrThrow(tx, { userId: user.id, action: "PRODUCT_LISTING_UPDATED", resourceType: "product_listing", resourceId: id, metadata: { action: "UNPUBLISHED" }, request });
    return result;
  });
  return jsonOk({ listing: updated });
}
