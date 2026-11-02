import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { LoginForm } from "@/components/AuthForms";
import { getAppUser } from "@/lib/auth/session";
import { ROLE_HOME, isSafeRelativePath } from "@/lib/roles";

export const metadata: Metadata = { title: "Provider sign in" };
const NOTICES: Record<string, string> = {
  suspended: "This account is suspended.",
  profile: "Your account setup is incomplete. Contact support.",
  callback: "That confirmation link is invalid or has expired. Register again or sign in.",
  unavailable: "The service is temporarily unavailable. Please try again shortly.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const user = await getAppUser().catch(() => null);
  if (user && user.status !== "SUSPENDED") redirect(ROLE_HOME[user.role]);
  return (
    <AppShell>
      <h1>Provider sign in</h1>
      <LoginForm next={isSafeRelativePath(next) ? next : undefined} notice={error ? NOTICES[error] : undefined} />
      <p style={{ marginTop: "1rem" }}>Need a provider account? <Link href="/register">Register as an individual or business provider</Link>.</p>
      <p className="hint">The public marketplace can be browsed without signing in. Existing legacy customer accounts do not have a buyer dashboard.</p>
    </AppShell>
  );
}
