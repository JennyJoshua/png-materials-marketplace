import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { ProductBrowser } from "@/components/ProductBrowser";

export const metadata: Metadata = { title: "Browse building materials" };
export const dynamic = "force-dynamic";

export default function ProductsPage() {
  return (
    <AppShell>
      <h1>Find building materials and compare prices</h1>
      <p className="muted">
        Browse supplier-listed products across Papua New Guinea. Confirm prices and availability
        directly before purchase.
      </p>
      <ProductBrowser />
    </AppShell>
  );
}
