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

  const result = await prisma.$transaction(async (tx) => {
    const listing = await tx.productListing.findFirst({ where: { id, providerProfileId: provider.id }, select: { id: true, listingStatus: true, category: { select: { status: true } }, price: true, unit: true } });
    if (!listing) return { error: "NOT_FOUND" as const };
    if (listing.listingStatus === "ARCHIVED" || listing.listingStatus === "SUSPENDED") return { error: "LOCKED" as const };
    if (listing.category.status !== "ACTIVE" || Number(listing.price) <= 0 || !listing.unit.trim()) return { error: "INCOMPLETE" as const };
    const updated = await tx.productListing.update({ where: { id }, data: { listingStatus: "ACTIVE" }, select: { id: true, listingStatus: true } });
    await writeAuditLogOrThrow(tx, { userId: user.id, action: "PRODUCT_LISTING_PUBLISHED", resourceType: "product_listing", resourceId: id, request });
    return { listing: updated };
  });
  if ("error" in result) {
    if (result.error === "NOT_FOUND") return jsonError(404, "LISTING_NOT_FOUND", "Product listing not found.");
    if (result.error === "LOCKED") return jsonError(409, "LISTING_LOCKED", "Archived or suspended listings cannot be published.");
    return jsonError(400, "LISTING_INCOMPLETE", "The listing must have a valid price, unit and active category before publishing.");
  }
  return jsonOk({ listing: result.listing });
}
