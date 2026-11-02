import Link from "next/link";
import type { ReactNode } from "react";
import type { Role } from "@/lib/roles";
import { ROLE_HOME } from "@/lib/roles";

type ShellUser = { fullName: string; role: Role } | null;

export function AppShell({
  user,
  children,
}: {
  user?: ShellUser;
  children: ReactNode;
}) {
  const isPreview = process.env.IS_PULL_REQUEST === "true";

  return (
    <>
      <header className="site-header">
        <div className="inner">
          <Link href="/" className="brand">
            PNG Materials Marketplace
          </Link>
          <nav className="site-nav" aria-label="Main">
            <Link href="/products">Browse products</Link>
            {user ? (
              <>
                <Link href={ROLE_HOME[user.role]}>Dashboard</Link>
                <Link href="/provider/profile">Provider profile</Link>
                <Link href="/provider/products">My listings</Link>
                {user.role === "ADMIN" ? (
                  <Link href="/admin/providers">Manage providers</Link>
                ) : null}
                <form action="/api/auth/logout" method="post">
                  <button type="submit">Sign out</button>
                </form>
              </>
            ) : isPreview ? (
              <span className="badge">Read-only preview</span>
            ) : (
              <>
                <Link href="/login">Sign in</Link>
                <Link href="/register">Create account</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      {isPreview ? (
        <div className="preview-notice" role="status">
          Preview version — browsing only. Sign-in, supplier workspaces and changes are disabled.
        </div>
      ) : null}
      <main>{children}</main>
      <footer className="site-footer">
        PNG Materials Marketplace · Supplier-listed products and prices. Confirm details directly
        with providers.
      </footer>
    </>
  );
}
