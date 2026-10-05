import Link from "next/link";
import type { Role } from "@/lib/roles";
import { ROLE_HOME } from "@/lib/roles";

type ShellUser = { fullName: string; role: Role } | null;

/** Consistent page frame: header, navigation, main content, footer. */
export function AppShell({ user, children }: { user?: ShellUser; children: React.ReactNode }) {
  return (
    <>
      <header className="site-header">
        <div className="inner">
          <Link href="/" className="brand">
            PNG Materials Marketplace
          </Link>
          <nav className="site-nav" aria-label="Main">
            {user ? (
              <>
                <Link href={ROLE_HOME[user.role]}>Dashboard</Link>
                {/* POST form: logging out is a state change, so it is never a plain link. */}
                <form action="/api/auth/logout" method="post">
                  <button type="submit">Sign out</button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login">Sign in</Link>
                <Link href="/register">Create account</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        PNG Materials Marketplace · Phase 1 foundation. Suppliers set their own prices and stock.
      </footer>
    </>
  );
}
