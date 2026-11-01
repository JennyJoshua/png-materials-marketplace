import { requireApiAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { jsonError, jsonOk, readJson } from "@/lib/security/http";
import { productCategoryInputSchema } from "@/lib/validation/products";
import { writeAuditLogOrThrow } from "@/lib/security/audit";
import { Prisma } from "@prisma/client";

export async function GET() {
  const { response } = await requireApiAccess(["ADMIN"]);
  if (response) return response;
  const categories = await prisma.productCategory.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: { id: true, name: true, description: true, status: true, createdAt: true, updatedAt: true, _count: { select: { listings: true } } },
  });
  return jsonOk({ categories });
}

export async function POST(request: Request) {
  const { user, response } = await requireApiAccess(["ADMIN"]);
  if (response) return response;
  const parsed = productCategoryInputSchema.safeParse(await readJson(request));
  if (!parsed.success || !parsed.data.name) return jsonError(400, "VALIDATION_ERROR", "Enter a valid category name and description.");
  try {
    const category = await prisma.$transaction(async (tx) => {
      const created = await tx.productCategory.create({
        data: { name: parsed.data.name!, description: parsed.data.description, status: parsed.data.status ?? "ACTIVE" },
        select: { id: true, name: true, description: true, status: true },
      });
      await writeAuditLogOrThrow(tx, { userId: user.id, action: "PRODUCT_CATEGORY_CREATED", resourceType: "product_category", resourceId: created.id, metadata: { name: created.name }, request });
      return created;
    });
    return jsonOk({ category }, 201);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError(409, "CATEGORY_EXISTS", "A product category with that name already exists.");
    }
    throw error;
  }
}
