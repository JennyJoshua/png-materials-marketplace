import { requireApiAccess } from "@/lib/auth/guards";
import { getOwnedActiveProvider } from "@/lib/auth/provider-access";
import { prisma } from "@/lib/db/prisma";
import { jsonError, jsonOk, readJson, sameOriginError } from "@/lib/security/http";
import { productListingPatchSchema } from "@/lib/validation/products";
import { Prisma } from "@prisma/client";
import { writeAuditLogOrThrow } from "@/lib/security/audit";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const originError = sameOriginError(request);
  if (originError) return originError;
  const { user, response } = await requireApiAccess();
  if (response) return response;
  const provider = await getOwnedActiveProvider(user);
  if (!provider) return jsonError(403, "ACTIVE_PROVIDER_REQUIRED", "An active provider profile is required.");
  if (provider.providerType === "SERVICES") return jsonError(403, "PRODUCT_PROVIDER_REQUIRED", "Your provider profile is not enabled to list products.");
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError(404, "LISTING_NOT_FOUND", "Product listing not found.");
  const parsed = productListingPatchSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(400, "VALIDATION_ERROR", "Check the fields supplied for this product listing.");

  const existing = await prisma.productListing.findFirst({
    where: { id, providerProfileId: provider.id },
    select: { id: true, name: true, price: true, stockStatus: true, listingStatus: true },
  });
  if (!existing) return jsonError(404, "LISTING_NOT_FOUND", "Product listing not found.");
  if (existing.listingStatus === "ARCHIVED" || existing.listingStatus === "SUSPENDED") {
    return jsonError(409, "LISTING_LOCKED", "Archived or suspended listings cannot be edited.");
  }
  if (parsed.data.categoryId) {
    const category = await prisma.productCategory.findFirst({ where: { id: parsed.data.categoryId, status: "ACTIVE" }, select: { id: true } });
    if (!category) return jsonError(400, "CATEGORY_UNAVAILABLE", "Choose an active product category.");
  }
  const priceChanged = parsed.data.price !== undefined && !new Prisma.Decimal(parsed.data.price).equals(existing.price);
  const stockChanged = parsed.data.stockStatus !== undefined && parsed.data.stockStatus !== existing.stockStatus;

  const listing = await prisma.$transaction(async (tx) => {
    const updated = await tx.productListing.update({
      where: { id },
      data: {
        ...parsed.data,
        ...(priceChanged ? { priceUpdatedAt: new Date() } : {}),
        ...(stockChanged ? { stockUpdatedAt: new Date() } : {}),
      },
      select: { id: true, name: true, price: true, stockStatus: true, listingStatus: true, priceUpdatedAt: true, stockUpdatedAt: true, updatedAt: true },
    });
    await writeAuditLogOrThrow(tx, { userId: user.id, action: "PRODUCT_LISTING_UPDATED", resourceType: "product_listing", resourceId: id, metadata: { priceChanged, stockChanged }, request });
    return updated;
  });
  return jsonOk({ listing });
}
