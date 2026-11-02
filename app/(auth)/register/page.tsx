import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RegisterForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Register as a provider" };

export default function RegisterPage() {
  return (
    <AppShell>
      <h1>Register as a provider</h1>
      <p className="muted">Registration is for people and businesses offering goods, services or both. Anyone can browse the marketplace without an account.</p>
      <RegisterForm />
      <p style={{ marginTop: "1rem" }}>Already have a provider account? <Link href="/login">Sign in</Link>.</p>
    </AppShell>
  );
}
