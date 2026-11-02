import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export default function HomePage() {
  return (
    <AppShell>
      <section className="home-hero">
        <p className="eyebrow">Papua New Guinea marketplace</p>
        <h1>Discover goods and services from providers across Papua New Guinea.</h1>
        <p className="hero-copy">
          Browse publicly without creating an account. Compare provider listings, check availability
          and contact providers directly. Building materials remain an important marketplace category.
        </p>
        <div className="hero-actions">
          <Link href="/products" className="btn">Browse goods</Link>
          <Link href="/register" className="btn secondary">Register as a provider</Link>
        </div>
        <p className="hero-note">Free public browsing · No buyer account required · Confirm details directly with providers</p>
      </section>
      <section className="home-columns">
        <article className="panel">
          <h2>For the public</h2>
          <p>Search goods and compare provider listings without registering or signing in.</p>
          <Link href="/products">Explore goods →</Link>
        </article>
        <article className="panel">
          <h2>For individual providers</h2>
          <p>Register to offer your products, services or both under one provider profile.</p>
          <Link href="/register">Create an individual provider account →</Link>
        </article>
        <article className="panel">
          <h2>For business providers</h2>
          <p>Publish your business offers and manage your provider profile from one account.</p>
          <Link href="/register">Create a business provider account →</Link>
        </article>
      </section>
    </AppShell>
  );
}
