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

## 5. Still to do before Phase 2

The project owner must create the Supabase project, apply the migration, run the seed, test live sign-up and sign-in, create the first administrator, and (when ready) deploy to Render. Steps: docs/SETUP_SUPABASE.md and docs/SETUP_RENDER.md.

## 6. Do not implement yet

Supplier catalogue, product management, marketplace, product search, price comparison, projects, material lists, RFQs, quotations, orders, payments, delivery, AI, price intelligence. These need a separate specification.
