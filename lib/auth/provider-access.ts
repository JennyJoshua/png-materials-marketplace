import { prisma } from "@/lib/db/prisma";
import type { AppUser } from "@/lib/auth/session";

/** Resolve the provider profile from the authenticated database user; never accept a client profile ID. */
export async function getOwnedActiveProvider(user: AppUser) {
  return prisma.providerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, userId: true, status: true, providerType: true },
  }).then((profile) => profile?.status === "ACTIVE" ? profile : null);
}
