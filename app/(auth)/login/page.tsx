import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { LoginForm } from "@/components/AuthForms";
import { getAppUser } from "@/lib/auth/session";
import { ROLE_HOME, isSafeRelativePath } from "@/lib/roles";

export const metadata: Metadata = { title: "Sign in" };

const NOTICES: Record<string, string> = {
  suspended: "This account is suspended.",
  profile: "Your account setup is incomplete. Contact support.",
  callback: "That confirmation link is invalid or has expired. Register again or sign in.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const user = await getAppUser().catch(() => null);
  if (user && user.status !== "SUSPENDED") redirect(ROLE_HOME[user.role]);

  return (
    <AppShell>
      <h1>Sign in</h1>
      <LoginForm next={isSafeRelativePath(next) ? next : undefined} notice={error ? NOTICES[error] : undefined} />
      <p style={{ marginTop: "1rem" }}>
        New here? <Link href="/register">Create an account</Link>.
      </p>
    </AppShell>
  );
}
