import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { LoginForm } from "@/components/AuthForms";
import { getAppUser } from "@/lib/auth/session";
import { isSafeRelativePath } from "@/lib/roles";

export const metadata: Metadata = { title: "Administrator sign in" };
const NOTICES: Record<string, string> = {
  suspended: "This administrator account is suspended. Contact the platform owner.",
  profile: "Your administrator account setup is incomplete. Contact the platform owner.",
  unavailable: "The service is temporarily unavailable. Please try again shortly.",
};

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const user = await getAppUser().catch(() => null);
  if (user && user.status !== "SUSPENDED") {
    if (user.role === "ADMIN") redirect("/admin/dashboard");
    if (user.role === "SUPPLIER") redirect("/supplier/dashboard");
  }
  return (
    <AppShell>
      <h1>Administrator sign in</h1>
      <p className="hint">This restricted sign-in is for authorised platform administrators only. Provider accounts cannot access administration.</p>
      <LoginForm endpoint="/api/auth/admin-login" next={isSafeRelativePath(next) ? next : undefined} notice={error ? NOTICES[error] : undefined} />
      <p style={{ marginTop: "0.75rem" }}><Link href="/admin/forgot-password">Forgot your password or setting it up for the first time?</Link></p>
      <p style={{ marginTop: "1rem" }}>Are you a provider? <Link href="/login">Go to provider sign in</Link>.</p>
    </AppShell>
  );
}
