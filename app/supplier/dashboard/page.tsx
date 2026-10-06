import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { AccountPanel, ComingLater, PhaseNotice } from "@/components/DashboardParts";
import { requirePageRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = { title: "Supplier dashboard" };
export const dynamic = "force-dynamic";

export default async function SupplierDashboard() {
  const user = await requirePageRole("SUPPLIER", "/supplier/dashboard");
  // Scoped by the verified user id, never by an id taken from the URL or request.
  const profile = await prisma.supplierProfile.findUnique({
    where: { userId: user.id },
    select: { businessName: true, location: true, verificationStatus: true },
  });

  return (
    <AppShell user={user}>
      <h1>Supplier dashboard</h1>
      <AccountPanel user={user} />
      {profile ? (
        <section className="panel" aria-labelledby="business-heading">
          <h2 id="business-heading">Your business</h2>
          <dl className="facts">
            <dt>Business</dt>
            <dd>{profile.businessName}</dd>
            <dt>Location</dt>
            <dd>{profile.location}</dd>
            <dt>Verification</dt>
            <dd>
              <span className="badge gold">{profile.verificationStatus}</span>
            </dd>
          </dl>
          <p className="muted" style={{ marginTop: "0.75rem", marginBottom: 0 }}>
            An administrator reviews new suppliers. Verification does not guarantee prices, stock or quality.
          </p>
        </section>
      ) : null}
      <PhaseNotice>
        Your supplier account is set up. Adding products and prices, receiving quotation requests and managing orders will be
        added in later phases.
      </PhaseNotice>
      <ComingLater items={["My products and prices", "Quotation requests", "My quotations", "My orders"]} />
    </AppShell>
  );
}
