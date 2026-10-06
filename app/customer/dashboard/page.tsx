import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { AccountPanel, ComingLater, PhaseNotice } from "@/components/DashboardParts";
import { requirePageRole } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Customer dashboard" };
export const dynamic = "force-dynamic";

export default async function CustomerDashboard() {
  // Authorization is re-checked here against the database role; never rely on middleware alone.
  const user = await requirePageRole("CUSTOMER", "/customer/dashboard");
  return (
    <AppShell user={user}>
      <h1>My dashboard</h1>
      <AccountPanel user={user} />
      <PhaseNotice>
        Your account is set up. Finding materials, projects, quotation requests and orders will be added in later phases.
      </PhaseNotice>
      <ComingLater items={["Find materials", "My projects", "My quotation requests", "My quotations", "My orders"]} />
    </AppShell>
  );
}
