import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PasswordUpdateForm } from "@/components/AuthForms";
import { getAuthUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function UpdatePasswordPage() {
  const user = await getAuthUser().catch(() => null);
  if (!user) redirect("/admin/login?error=recovery");
  return (
    <AppShell>
      <h1>Choose a new password</h1>
      <p className="hint">Set a password for the account associated with {user.email}. Use at least 10 characters, including a letter and a number.</p>
      <PasswordUpdateForm />
    </AppShell>
  );
}
