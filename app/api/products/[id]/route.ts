import { prisma } from "@/lib/db/prisma";
import { jsonError, jsonOk } from "@/lib/security/http";
import { publicListingWhere, publicProductSelect } from "@/lib/products/queries";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError(404, "PRODUCT_NOT_FOUND", "Product listing not found.");
  const product = await prisma.productListing.findFirst({
    where: { id, ...publicListingWhere() },
    select: publicProductSelect,
  });
  if (!product) return jsonError(404, "PRODUCT_NOT_FOUND", "Product listing not found.");
  return jsonOk({ product });
}
