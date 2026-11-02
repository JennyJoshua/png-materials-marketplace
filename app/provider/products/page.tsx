import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getAppUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { ProviderProducts } from "@/components/ProviderProducts";

export const metadata: Metadata = { title: "My product listings" };
export const dynamic = "force-dynamic";

export default async function ProviderProductsPage() {
  const user = await getAppUser();
  if (!user) redirect("/login?next=%2Fprovider%2Fproducts");
  if (user.status === "SUSPENDED") redirect("/login?error=suspended");

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    select: { status: true, providerType: true },
  });

  return (
    <AppShell user={user}>
      <h1>My product listings</h1>
      <p className="muted">Manage the products and prices shown to buyers.</p>

      {!provider ? (
        <section className="panel">
          <h2>Set up your provider profile</h2>
          <Link className="btn" href="/provider/profile">
            Open provider profile
          </Link>
        </section>
      ) : provider.status !== "ACTIVE" ? (
        <section className="panel">
          <h2>Provider approval pending</h2>
          <p>
            Your profile is {provider.status.toLowerCase().replace("_", " ")}. An administrator
            must activate it before you can list products.
          </p>
          <Link href="/provider/profile">View profile</Link>
        </section>
      ) : provider.providerType === "SERVICES" ? (
        <section className="panel">
          <h2>Product listings not enabled</h2>
          <p>Your profile is for services rather than products.</p>
        </section>
      ) : (
        <ProviderProducts />
      )}
    </AppShell>
  );
}
