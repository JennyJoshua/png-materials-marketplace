import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { ProviderEnquiries } from "@/components/ProviderEnquiries";
import { requirePageRole } from "@/lib/auth/guards";
import { getOwnedActiveProvider } from "@/lib/auth/provider-access";
import "./enquiries.css";

export const metadata: Metadata = { title: "Enquiry inbox" };
export const dynamic = "force-dynamic";

export default async function ProviderEnquiriesPage() {
  const user = await requirePageRole("SUPPLIER", "/provider/enquiries");
  const provider = await getOwnedActiveProvider(user);
  return (
    <AppShell user={user}>
      <h1>Enquiry inbox</h1>
      <p className="muted">Review and manage product enquiries sent by public visitors.</p>
      {provider ? (
        <ProviderEnquiries />
      ) : (
        <section className="panel">
          <h2>Active provider profile required</h2>
          <p>Your provider account and profile must both be active before you can access enquiries.</p>
        </section>
      )}
    </AppShell>
  );
}
