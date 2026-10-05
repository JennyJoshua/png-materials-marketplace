import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export default function HomePage() {
  return (
    <AppShell>
      <h1>Building materials, from suppliers across Papua New Guinea</h1>
      <p>
        PNG Materials Marketplace will connect customers with hardware stores and building-material suppliers. Suppliers keep
        control of their own products, prices and stock.
      </p>
      <section className="panel status" aria-labelledby="status-heading">
        <h2 id="status-heading">What works today</h2>
        <p>
          The account system is ready: customers and suppliers can register and sign in, and each has a private dashboard.
          Product listings, price comparison, quotation requests and orders are planned for later phases.
        </p>
        <p style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: 0 }}>
          <Link href="/register" className="btn">Create account</Link>
          <Link href="/login" className="btn secondary">Sign in</Link>
        </p>
      </section>
    </AppShell>
  );
}
