import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { requirePageRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { ProviderProfileForm } from "./ProviderProfileForm";

export const metadata: Metadata = { title: "My provider profile" };
export const dynamic = "force-dynamic";

export default async function ProviderProfilePage() {
  const user = await requirePageRole("SUPPLIER", "/provider/profile");
  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    select: {
      displayName: true, providerKind: true, providerType: true, description: true, phone: true,
      publicEmail: true, address: true, province: true, district: true, townOrArea: true,
      businessRegistrationNumber: true, websiteUrl: true, logoUrl: true, deliveryAvailable: true,
      pickupAvailable: true, status: true, verificationLevel: true,
    },
  });
  return (
    <AppShell user={user}>
      <h1>Provider profile</h1>
      <p className="muted">Manage the public profile used to offer your goods, services or both. Visitors can browse without signing in.</p>
      <ProviderProfileForm initial={profile} />
    </AppShell>
  );
}
