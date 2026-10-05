import { requireApiAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { jsonOk } from "@/lib/security/http";

/** ADMIN only (role checked against the database). Lists the 50 most recent users, safe fields only. */
export async function GET() {
  const { response } = await requireApiAccess(["ADMIN"]);
  if (response) return response;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, email: true, fullName: true, role: true, status: true, createdAt: true },
  });
  return jsonOk({ users });
}
