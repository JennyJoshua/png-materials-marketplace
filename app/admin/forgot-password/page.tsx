import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PasswordResetRequestForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Reset administrator password" };

export default function AdminForgotPasswordPage() {
  return (
    <AppShell>
      <h1>Reset administrator password</h1>
      <p className="hint">Enter the email address belonging to your existing administrator account. If an account exists, Supabase will send a secure recovery link.</p>
      <PasswordResetRequestForm />
      <p style={{ marginTop: "1rem" }}><Link href="/admin/login">Back to administrator sign in</Link></p>
    </AppShell>
  );
}
