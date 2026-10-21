# Changelog

All significant project changes are recorded here.

## [0.1.2] - 2026-10-21 - Phase 1 database status correction (documentation only)

No application code, Prisma schema, migration SQL, seed code, database configuration, authentication logic or Supabase setting was changed, and no functionality was added. Phase 2 has not started.

### Corrected
- docs/REVIEW.md now opens with a current status (verified, outstanding, unconfirmed) and keeps the review of 2026-10-05 as a marked historical record.
- Documentation no longer says the manual migration, the category seed or the RLS check are outstanding. As reported by the project owner on 2026-10-21: the Phase 1 migration SQL was applied manually to the live Supabase database; the seed ran (exactly 15 ACTIVE categories); RLS was enabled and checked on all five tables, with no policies and `anon`/`authenticated` privileges revoked.
- Documentation now explains that Prisma's migration history has not been baselined (`_prisma_migrations`), and that Phase 1 is partially complete. Outstanding: the baseline, safe Prisma connectivity verification, live sign-up, email-confirmation and sign-in testing, and confirmation of the Render deployment (status unconfirmed).
- Unsafe guidance removed: README, docs/SETUP_SUPABASE.md, docs/SETUP_RENDER.md, docs/TROUBLESHOOTING.md and docs/DATABASE.md told readers to run `prisma migrate deploy` against the database. They now warn against `migrate deploy`, `migrate dev`, `migrate reset` and `db push` on the existing live database until the baseline is done, and give a read-only checking procedure. A suggestion to use a scratch database URL as a Prisma shadow database was removed because it could wipe a database if pointed at the wrong one.
- DEC-030 marked superseded; DEC-046 added. ROADMAP, ARCHITECTURE (A13), PROJECT_REQUIREMENTS (10.1) and the Phase 1 handover updated to match.

## [0.1.1] - 2026-10-08 - Setup diagnostics fix

### Fixed
- Registration and login returned a bare "500" when Supabase settings were missing, and the terminal only printed "Error". Missing or invalid Supabase settings now return a clear 503 (`SERVER_NOT_CONFIGURED`). In development the message names the missing variables, never their values. In production users see a generic message.
- Server errors are now logged with the real cause on one line, with passwords, tokens, keys and connection-string credentials removed (`lib/security/log.ts`). Failures to save the registration hint (service-role key) and to create the database profile are no longer silent.
- Blank or whitespace-only variables are treated as missing; a Supabase URL that is not a URL is rejected.

### Added
- `docs/TROUBLESHOOTING.md`.
- Tests for configuration errors, log redaction, setup-failure responses, and a repository check that fails if the same file exists in both `public/` and `app/`.

### Known issue found in local testing (manual fix)
- `public/icon.svg` duplicated `app/icon.svg`, which makes Next.js return 500 for `/icon.svg` in development. Delete `public/icon.svg` and keep `app/icon.svg`. This was missed in earlier verification because the production build and the smoke test never requested `/icon.svg`.

## [0.1.0] - 2026-10-05 - Phase 1: Foundation (PARTIALLY COMPLETE)

### Repository reconciliation
- Inspected the repository first. GitHub `main` held one commit with documentation and configuration only (no application code, no `prisma/`, `lib/`, `tests/`, `.gitignore` or `.env.example`). The working copy used for this phase also held earlier, unreconciled and unverified implementation work, which was reviewed, kept where correct, and completed.
- Removed the placeholder `app/Tst1`.
- Moved `PROJECT_REQUIREMENTS.md` into `docs/`.

### Architecture migration
- Locked architecture: GitHub, Render, Next.js, Supabase (Auth, PostgreSQL, Storage), with Prisma. Replaces the earlier plan in which the application managed its own passwords and sessions.
- Removed `bcryptjs` and `jose`. Added `@supabase/supabase-js` and `@supabase/ssr`.
- Recorded as DEC-017 to DEC-030 in `docs/DECISIONS.md`.

### Authentication
- Supabase Auth handles passwords, sessions and confirmation email. Registration (customer or supplier), login, logout, `/auth/callback`.
- Identity verified server-side with `getUser()`, never `getSession()`.
- Registration works with email confirmation enabled (no session required); profile creation is idempotent; failed profile creation is recovered at next sign-in or callback.
- ADMIN cannot be chosen at registration; admin promotion is a documented manual step.

### Database
- Prisma schema and migration for five tables: `users`, `customer_profiles`, `supplier_profiles`, `product_categories`, `audit_logs`.
- `users.id` is the Supabase Auth UUID; no password columns; no foreign key to the `auth` schema.
- Row Level Security enabled on all five tables with no policies; table privileges revoked from `anon` and `authenticated`.
- Category seed (15 categories, idempotent).
- Migration status on 2026-10-05: **generated but unapplied** to Supabase (historical; superseded, see [0.1.2]).

### Security foundation
- Server-side role checks in every protected page and API route against the database role.
- Same-origin (CSRF) checks, strict input validation, generic login errors, no email-existence leak at sign-up, safe redirect targets.
- In-memory rate limiting for register and login (per instance; documented limits).
- Security response headers; audit-log foundation with credential-key sanitising.
- Service-role key confined to one server route; a test fails if client code imports it.

### Application
- App Router app: home, login, register, three protected dashboards, error, loading and not-found pages, web manifest, mobile-first styling with no external fonts or images.
- APIs: `/api/auth/register|login|logout`, `/api/users/me`, `/api/admin/users`.

### Tests
- 109 Vitest tests in 8 files, runnable without credentials (Supabase and Prisma mocked): authentication, authorization, role security, profile creation and recovery, validation, middleware, static migration/RLS checks, secret and client/server separation checks, phase boundary.

### Documentation
- README, ARCHITECTURE, DATABASE, DECISIONS, REQUIREMENTS, REVIEW and the Phase 1 handover reconciled with the real implementation. New `SETUP_SUPABASE.md` and `SETUP_RENDER.md`.

### Validation results (run 2026-10-05)
`npm install`, `prisma validate`, `prisma generate`, `npm run lint`, `npm run typecheck`, `npm test` (109 passed) and `npm run build` all exited 0. Prisma commands ran with stub engine binaries because the sandbox could not download Prisma's engines. See `docs/REVIEW.md` for exact details and what could not be verified.

### Not done (as of 2026-10-05; historical, see [0.1.2] for the current position)
Supabase project, migration application, seed run, live sign-up and sign-in test, Render deployment, password-reset page, Content-Security-Policy header.

## [0.1.0-planning] - Initial Foundation Planning

Product vision, workflows, MVP scope, initial architecture and database design, and the phase plan were written. No application code.
