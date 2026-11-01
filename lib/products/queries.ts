import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export const publicProductSelect = {
  id: true, name: true, brand: true, specification: true, description: true,
  unit: true, price: true, stockStatus: true, priceUpdatedAt: true,
  stockUpdatedAt: true, updatedAt: true,
  category: { select: { id: true, name: true } },
  providerProfile: { select: {
    id: true, displayName: true, province: true, district: true, townOrArea: true,
    phone: true, publicEmail: true, websiteUrl: true, pickupAvailable: true,
    deliveryAvailable: true, verificationLevel: true,
  } },
} satisfies Prisma.ProductListingSelect;

export function publicListingWhere() {
  return {
    listingStatus: "ACTIVE" as const,
    category: { status: "ACTIVE" as const },
    providerProfile: { status: "ACTIVE" as const, providerType: { in: ["PRODUCTS", "BOTH"] as const } },
  };
}

export async function findPublicProducts(params: {
  q?: string; categoryId?: string; providerId?: string; province?: string; district?: string;
  stockStatus?: "IN_STOCK" | "LIMITED_STOCK" | "OUT_OF_STOCK" | "CONTACT_SUPPLIER";
  minPrice?: string; maxPrice?: string; sort: "newest" | "name" | "price_asc" | "price_desc";
  page: number; pageSize: number;
}) {
  const where: Prisma.ProductListingWhereInput = {
    ...publicListingWhere(),
    ...(params.categoryId ? { categoryId: params.categoryId } : {}),
    ...(params.providerId ? { providerProfileId: params.providerId } : {}),
    ...(params.stockStatus ? { stockStatus: params.stockStatus } : {}),
    ...(params.province || params.district ? { providerProfile: {
      status: "ACTIVE", providerType: { in: ["PRODUCTS", "BOTH"] },
      ...(params.province ? { province: { equals: params.province, mode: "insensitive" } } : {}),
      ...(params.district ? { district: { equals: params.district, mode: "insensitive" } } : {}),
    } } : {}),
    ...(params.q ? { OR: [
      { name: { contains: params.q, mode: "insensitive" } },
      { brand: { contains: params.q, mode: "insensitive" } },
      { specification: { contains: params.q, mode: "insensitive" } },
    ] } : {}),
    ...(params.minPrice || params.maxPrice ? { price: {
      ...(params.minPrice ? { gte: new Prisma.Decimal(params.minPrice) } : {}),
      ...(params.maxPrice ? { lte: new Prisma.Decimal(params.maxPrice) } : {}),
    } } : {}),
  };
  const orderBy: Prisma.ProductListingOrderByWithRelationInput =
    params.sort === "name" ? { name: "asc" } :
    params.sort === "price_asc" ? { price: "asc" } :
    params.sort === "price_desc" ? { price: "desc" } : { updatedAt: "desc" };
  const [items, total] = await prisma.$transaction([
    prisma.productListing.findMany({ where, orderBy: [orderBy, { id: "asc" }], skip: (params.page - 1) * params.pageSize, take: params.pageSize, select: publicProductSelect }),
    prisma.productListing.count({ where }),
  ]);
  return { items, pagination: { page: params.page, pageSize: params.pageSize, total, pages: Math.ceil(total / params.pageSize) } };
}
