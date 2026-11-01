import { requireApiAccess } from "@/lib/auth/guards";
import { getOwnedActiveProvider } from "@/lib/auth/provider-access";
import { prisma } from "@/lib/db/prisma";
import { jsonError, jsonOk, readJson } from "@/lib/security/http";
import { productListingInputSchema } from "@/lib/validation/products";
import { writeAuditLogOrThrow } from "@/lib/security/audit";

export async function GET() {
  const { user, response } = await requireApiAccess();
  if (response) return response;
  const provider = await getOwnedActiveProvider(user);
  if (!provider) return jsonError(403, "ACTIVE_PROVIDER_REQUIRED", "An active provider profile is required.");
  const listings = await prisma.productListing.findMany({
    where: { providerProfileId: provider.id },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: { id: true, name: true, brand: true, unit: true, price: true, stockStatus: true, listingStatus: true, priceUpdatedAt: true, stockUpdatedAt: true, createdAt: true, updatedAt: true, category: { select: { id: true, name: true, status: true } } },
  });
  return jsonOk({ listings });
}

export async function POST(request: Request) {
  const { user, response } = await requireApiAccess();
  if (response) return response;
  const provider = await getOwnedActiveProvider(user);
  if (!provider) return jsonError(403, "ACTIVE_PROVIDER_REQUIRED", "An active provider profile is required.");
  if (provider.providerType === "SERVICES") return jsonError(403, "PRODUCT_PROVIDER_REQUIRED", "Your provider profile is not enabled to list products.");
  const body = await readJson(request);
  const parsed = productListingInputSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "VALIDATION_ERROR", "Check the product name, category, unit, price and stock status.");
  const category = await prisma.productCategory.findFirst({ where: { id: parsed.data.categoryId, status: "ACTIVE" }, select: { id: true } });
  if (!category) return jsonError(400, "CATEGORY_UNAVAILABLE", "Choose an active product category.");

  const listing = await prisma.$transaction(async (tx) => {
    const created = await tx.productListing.create({
      data: {
        providerProfileId: provider.id, categoryId: parsed.data.categoryId,
        name: parsed.data.name, brand: parsed.data.brand, specification: parsed.data.specification,
        description: parsed.data.description, unit: parsed.data.unit,
        price: parsed.data.price, stockStatus: parsed.data.stockStatus,
      },
      select: { id: true, name: true, price: true, stockStatus: true, listingStatus: true, createdAt: true },
    });
    await writeAuditLogOrThrow(tx, { userId: user.id, action: "PRODUCT_LISTING_CREATED", resourceType: "product_listing", resourceId: created.id, metadata: { name: created.name }, request });
    return created;
  });
  return jsonOk({ listing }, 201);
}
