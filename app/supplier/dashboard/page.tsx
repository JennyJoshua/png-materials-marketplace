import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AccountPanel } from "@/components/DashboardParts";
import { requirePageRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = { title: "Provider workspace" };
export const dynamic = "force-dynamic";

export default async function ProviderDashboard() {
  const user = await requirePageRole("SUPPLIER", "/supplier/dashboard");
  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    select: { displayName: true, providerKind: true, providerType: true, province: true, status: true, verificationLevel: true },
  });
  return (
    <AppShell user={user}>
      <h1>Provider workspace</h1>
      <AccountPanel user={user} />
      {profile ? (
        <section className="panel" aria-labelledby="provider-heading">
          <h2 id="provider-heading">Your provider profile</h2>
          <dl className="facts">
            <dt>Public name</dt><dd>{profile.displayName}</dd>
            <dt>Provider account</dt><dd>{profile.providerKind === "INDIVIDUAL" ? "Individual provider" : "Business provider"}</dd>
            <dt>Offers</dt><dd>{profile.providerType === "BOTH" ? "Goods and services" : profile.providerType === "PRODUCTS" ? "Goods" : "Services"}</dd>
            <dt>Province</dt><dd>{profile.province}</dd>
            <dt>Approval</dt><dd><span className="badge">{profile.status}</span></dd>
            <dt>Verification</dt><dd>{profile.verificationLevel}</dd>
          </dl>
          <p><Link href="/provider/profile">Edit provider profile</Link></p>
        </section>
      ) : (
        <section className="panel"><h2>Complete your provider profile</h2><Link className="btn" href="/provider/profile">Set up profile</Link></section>
      )}
      <section className="panel">
        <h2>Manage goods</h2>
        <p>Approved providers with goods capability can publish and manage product listings.</p>
        <Link href="/provider/products">Manage my product listings</Link>
      </section>
      <p className="muted">The public does not need accounts to search for or purchase from providers. Your provider account is for managing your offers.</p>
    </AppShell>
  );
}
