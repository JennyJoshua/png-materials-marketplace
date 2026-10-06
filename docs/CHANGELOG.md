# Changelog

All significant project changes are recorded here.

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
- Migration status: **generated but unapplied** to Supabase.

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

### Not done
Supabase project, migration application, seed run, live sign-up and sign-in test, Render deployment, password-reset page, Content-Security-Policy header.

## [0.1.0-planning] - Initial Foundation Planning

Product vision, workflows, MVP scope, initial architecture and database design, and the phase plan were written. No application code.
