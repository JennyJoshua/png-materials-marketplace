import { requireApiAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { jsonError, jsonOk, readJson } from "@/lib/security/http";
import { productCategoryPatchSchema } from "@/lib/validation/products";
import { writeAuditLogOrThrow } from "@/lib/security/audit";
import { Prisma } from "@prisma/client";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiAccess(["ADMIN"]);
  if (response) return response;
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError(404, "CATEGORY_NOT_FOUND", "Product category not found.");
  const parsed = productCategoryPatchSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(400, "VALIDATION_ERROR", "Check the category fields supplied.");
  try {
    const result = await prisma.$transaction(async (tx) => {
      const old = await tx.productCategory.findUnique({ where: { id }, select: { id: true, name: true, status: true } });
      if (!old) return null;
      const updated = await tx.productCategory.update({
        where: { id }, data: parsed.data,
        select: { id: true, name: true, description: true, status: true, updatedAt: true },
      });
      await writeAuditLogOrThrow(tx, { userId: user.id, action: "PRODUCT_CATEGORY_UPDATED", resourceType: "product_category", resourceId: id, metadata: { oldName: old.name, newName: updated.name, oldStatus: old.status, newStatus: updated.status }, request });
      return updated;
    });
    if (!result) return jsonError(404, "CATEGORY_NOT_FOUND", "Product category not found.");
    return jsonOk({ category: result });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError(409, "CATEGORY_EXISTS", "A product category with that name already exists.");
    }
    throw error;
  }
}
