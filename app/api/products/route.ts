import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { jsonError, jsonOk } from "@/lib/security/http";
import { findPublicProducts } from "@/lib/products/queries";

const querySchema = z.object({
  q: z.string().trim().max(100).optional(),
  categoryId: z.string().uuid().optional(),
  providerId: z.string().uuid().optional(),
  province: z.string().trim().min(1).max(100).optional(),
  district: z.string().trim().min(1).max(100).optional(),
  stockStatus: z.enum(["IN_STOCK", "LIMITED_STOCK", "OUT_OF_STOCK", "CONTACT_SUPPLIER"]).optional(),
  minPrice: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/).optional(),
  maxPrice: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/).optional(),
  sort: z.enum(["newest", "name", "price_asc", "price_desc"]).default("newest"),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
}).strict();

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return jsonError(400, "VALIDATION_ERROR", "One or more search filters are invalid.");
  if (parsed.data.minPrice && parsed.data.maxPrice && Number(parsed.data.minPrice) > Number(parsed.data.maxPrice)) {
    return jsonError(400, "VALIDATION_ERROR", "Minimum price cannot exceed maximum price.");
  }
  const result = await findPublicProducts(parsed.data);
  return jsonOk(result);
}
