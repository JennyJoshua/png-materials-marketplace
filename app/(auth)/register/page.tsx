import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { RegisterForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <AppShell>
      <h1>Create your account</h1>
      <RegisterForm />
      <p style={{ marginTop: "1rem" }}>
        Already registered? <Link href="/login">Sign in</Link>.
      </p>
    </AppShell>
  );
}
