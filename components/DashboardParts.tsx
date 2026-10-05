import type { AppUser } from "@/lib/auth/session";

export function AccountPanel({ user }: { user: AppUser }) {
  return (
    <section className="panel" aria-labelledby="account-heading">
      <h2 id="account-heading">Your account</h2>
      <dl className="facts">
        <dt>Name</dt>
        <dd>{user.fullName}</dd>
        <dt>Email</dt>
        <dd>{user.email}</dd>
        <dt>Role</dt>
        <dd>
          <span className="badge">{user.role}</span>
        </dd>
        <dt>Status</dt>
        <dd>{user.status}</dd>
      </dl>
    </section>
  );
}

export function PhaseNotice({ children }: { children: React.ReactNode }) {
  return (
    <section className="panel status" aria-labelledby="phase-heading">
      <h2 id="phase-heading">Phase 1: account foundation</h2>
      <p style={{ marginBottom: 0 }}>{children}</p>
    </section>
  );
}

/** Placeholder tiles for later phases. They are not links on purpose: they must not pretend to work. */
export function ComingLater({ items }: { items: string[] }) {
  return (
    <section aria-labelledby="later-heading">
      <h2 id="later-heading">Coming in a later phase</h2>
      <div className="grid three">
        {items.map((item) => (
          <div className="tile" key={item}>
            <h3>{item}</h3>
            <p>Not available yet.</p>
          </div>
        ))}
      </div>
    </section>
  );
}
