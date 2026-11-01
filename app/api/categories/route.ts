import { prisma } from "@/lib/db/prisma";
import { jsonOk } from "@/lib/security/http";

export const dynamic = "force-dynamic";

/** Public filter catalogue; inactive categories are never offered to buyers. */
export async function GET() {
  const categories = await prisma.productCategory.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, description: true },
  });
  return jsonOk({ categories });
}
