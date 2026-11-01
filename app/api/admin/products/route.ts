import { requireApiAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { jsonError, jsonOk } from "@/lib/security/http";
import { z } from "zod";

const filters = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "SUSPENDED", "ARCHIVED"]).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
}).strict();

export async function GET(request: Request) {
  const { response } = await requireApiAccess(["ADMIN"]);
  if (response) return response;
  const url = new URL(request.url);
  const parsed = filters.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return jsonError(400, "VALIDATION_ERROR", "Invalid moderation filters.");
  const where = {
    ...(parsed.data.status ? { listingStatus: parsed.data.status } : {}),
    ...(parsed.data.q ? { OR: [
      { name: { contains: parsed.data.q, mode: "insensitive" as const } },
      { brand: { contains: parsed.data.q, mode: "insensitive" as const } },
    ] } : {}),
  };
  const [listings, total] = await prisma.$transaction([
    prisma.productListing.findMany({
      where, orderBy: { updatedAt: "desc" }, skip: (parsed.data.page - 1) * 50, take: 50,
      select: {
        id: true, name: true, brand: true, price: true, unit: true, stockStatus: true, listingStatus: true, createdAt: true, updatedAt: true,
        category: { select: { id: true, name: true, status: true } },
        providerProfile: { select: { id: true, displayName: true, province: true, district: true, status: true } },
      },
    }),
    prisma.productListing.count({ where }),
  ]);
  return jsonOk({ listings, pagination: { page: parsed.data.page, pageSize: 50, total, pages: Math.ceil(total / 50) } });
}
