import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { AccountPanel, ComingLater, PhaseNotice } from "@/components/DashboardParts";
import { requirePageRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = { title: "Admin dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const user = await requirePageRole("ADMIN", "/admin/dashboard");
  const [customers, suppliers, pendingSuppliers] = await Promise.all([
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.user.count({ where: { role: "SUPPLIER" } }),
    prisma.supplierProfile.count({ where: { verificationStatus: "PENDING" } }),
  ]);

  return (
    <AppShell user={user}>
      <h1>Administration</h1>
      <AccountPanel user={user} />
      <section className="panel" aria-labelledby="counts-heading">
        <h2 id="counts-heading">Accounts</h2>
        <dl className="facts">
          <dt>Customers</dt>
          <dd>{customers}</dd>
          <dt>Suppliers</dt>
          <dd>{suppliers}</dd>
          <dt>Suppliers awaiting verification</dt>
          <dd>{pendingSuppliers}</dd>
        </dl>
      </section>
      <PhaseNotice>
        Account counts are read-only in Phase 1. User and supplier management, categories and audit-log review will be added in
        later phases.
      </PhaseNotice>
      <ComingLater items={["Manage users", "Verify suppliers", "Manage categories", "Review audit logs"]} />
    </AppShell>
  );
}
