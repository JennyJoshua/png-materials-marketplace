import Link from "next/link";
import type { ReactNode } from "react";
import type { Role } from "@/lib/roles";

type ShellUser = { fullName: string; role: Role } | null;

export function AppShell({ user, children }: { user?: ShellUser; children: ReactNode }) {
  const isPreview = process.env.IS_PULL_REQUEST === "true";
  return (
    <>
      <header className="site-header">
        <div className="inner">
          <Link href="/" className="brand">PNG Materials Marketplace</Link>
          <nav className="site-nav" aria-label="Main">
            <Link href="/products">Browse goods</Link>
            {user?.role === "SUPPLIER" ? (
              <>
                <Link href="/supplier/dashboard">Provider workspace</Link>
                <Link href="/provider/profile">Provider profile</Link>
                <Link href="/provider/products">My product listings</Link>
                <Link href="/provider/enquiries">Enquiry inbox</Link>
                <form action="/api/auth/logout" method="post"><button type="submit">Sign out</button></form>
              </>
            ) : user?.role === "ADMIN" ? (
              <>
                <Link href="/admin/dashboard">Admin dashboard</Link>
                <Link href="/admin/providers">Manage providers</Link>
                <form action="/api/auth/logout" method="post"><button type="submit">Sign out</button></form>
              </>
            ) : user ? (
              <form action="/api/auth/logout" method="post"><button type="submit">Sign out</button></form>
            ) : isPreview ? (
              <span className="badge">Read-only preview</span>
            ) : (
              <>
                <Link href="/login">Provider sign in</Link>
                <Link href="/register">Register as a provider</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      {isPreview ? <div className="preview-notice" role="status">Preview version — browsing only. Public marketplace browsing is enabled; sign-in and changes are disabled.</div> : null}
      <main>{children}</main>
      <footer className="site-footer">
        PNG Materials Marketplace · Public goods discovery and provider-listed prices. Confirm details directly with providers.
      </footer>
    </>
  );
}
