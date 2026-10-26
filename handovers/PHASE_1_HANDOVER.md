# Phase 1 handover: Foundation (corrected specification and completion record)

Project: PNG Materials Marketplace
Repository: JennyJoshua/png-materials-marketplace
Phase: Phase 1 only. Do not begin Phase 2.
Status: **PARTIALLY COMPLETE** (see docs/REVIEW.md)

This file replaces the earlier handover, which assumed the application would manage its own passwords. It records the corrected specification and what was done.

## 1. Locked architecture

GitHub, Render web service, one Next.js app (frontend and API), Supabase (Auth, PostgreSQL, Storage). Prisma is the ORM. No microservices, no native Android app.

## 2. Phase 1 scope

Application: Next.js App Router, TypeScript, mobile-first layout, error/loading/not-found pages.
Authentication: Supabase Auth (registration, login, logout, sessions, protected routes).
Roles: CUSTOMER, SUPPLIER, ADMIN. The database profile is the authoritative role.
Database: five tables only: `users`, `customer_profiles`, `supplier_profiles`, `product_categories`, `audit_logs`. Later phases add their own tables and migrations.
Dashboards: `/customer/dashboard`, `/supplier/dashboard`, `/admin/dashboard` showing the user, role and a Phase 1 notice.
Security: RLS on every table, server-side authorization, validation, rate limiting, audit-log foundation, no secrets in GitHub.
Tests: runnable without credentials.

## 3. Rules that must not be broken

- Never trust a role from the client, a form, a query string, a request body or `user_metadata`.
- Use `getUser()` for server-side identity; never `getSession()`.
- `users.id` is the Supabase Auth UUID: no default, no foreign key to the `auth` schema, no password column.
- ADMIN cannot be chosen at public registration. No admin or password is seeded.
- Enable RLS on every public table; add no `USING (true)` policies.
- Do not claim anything works unless it was run. Do not invent credentials.

## 4. What was done

See docs/REVIEW.md for the full record and actual command results, docs/CHANGELOG.md for the change list, and docs/DECISIONS.md (DEC-017 to DEC-030) for the reasoning.

## 5. Status before Phase 2 (updated 2026-10-25)

Reported on the live Supabase database (owner, 2026-10-21; handover, 2026-10-24): the migration SQL was applied manually; the category seed ran (15 ACTIVE categories); RLS is enabled on all five tables (no policies, `anon`/`authenticated` privileges revoked).

Unresolved: whether Prisma's `_prisma_migrations` already records the migration (the two reports conflict; read-only check in `docs/sql/phase1-readonly-checks.sql`); live sign-up, email-confirmation and sign-in testing; Render deployment status and the current `DATABASE_URL`; owner decisions on security findings. See `docs/PHASE_1_VERIFICATION_REPORT.md`.

Do not run `prisma migrate deploy`, `migrate dev`, `migrate reset` or `db push` against the existing live database without the owner's approval of the exact operation, and do not edit `migration.sql`. Phase 1 is PARTIALLY COMPLETE. Phase 2 has not started.

## 6. Do not implement yet

Supplier catalogue, product management, marketplace, product search, price comparison, projects, material lists, RFQs, quotations, orders, payments, delivery, AI, price intelligence. These need a separate specification.
