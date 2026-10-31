# Project Review

Version: 0.1.0
Phase: Phase 1 (Foundation)
Status last updated: 2026-10-25 (stabilisation pass; see docs/PHASE_1_VERIFICATION_REPORT.md)

**Phase 1 status: PARTIALLY COMPLETE**

This file has two parts. **Current status** is the latest position. **Historical record** is the review of 2026-10-05, kept for history. Where the two disagree, the current status wins.

---

# Current status (updated 2026-10-25)

Evidence note: the items marked VERIFIED were checked on the live Supabase database by the project owner and reported on 2026-10-21. They were not produced by this repository's automated tests, and no check output is stored in this repository. Items marked OUTSTANDING or UNCONFIRMED must not be read as done. Observations quoted from the 2026-10-24 handover are marked "reported" and have not been verified by anyone who wrote this file.

## Update 2026-10-25 (stabilisation pass)

The 2026-10-24 handover (`handovers/PHASE_1_COMPLETION_AND_STABILISATION.md`) was executed **without access to Render or Supabase**. Details, evidence tags and test results are in `docs/PHASE_1_VERIFICATION_REPORT.md`.

- **New conflicting evidence, not resolved:** the handover reports that the live `_prisma_migrations` table already holds one completed record for the migration. That conflicts with the 2026-10-21 report below that it is not recorded. See Outstanding item 1.
- **Code changes, not deployed:** safer behaviour when the database fails after Supabase sign-in succeeds (login, e-mail confirmation callback, protected APIs), logging of profile-recovery failures, a patch-level dependency update, and an environment checker. 38 new automated tests. They are in a ZIP for owner review and have not been merged.
- **No production change was made.** No migration command was run. `migration.sql` was deliberately **not** edited, because its checksum may already be recorded.
- Phase 1 remains **PARTIALLY COMPLETE**. Phase 2 has not started.

## Completed and verified

1. The Phase 1 migration SQL (`prisma/migrations/20261005000000_phase1_foundation/migration.sql`) was **applied manually** to the live Supabase PostgreSQL database.
2. The product-category seed **ran successfully**. Exactly 15 product categories exist and all are ACTIVE: Cement & Concrete, Steel & Reinforcement, Timber, Roofing, Plumbing, Electrical, Paint, Building Boards, Doors & Windows, Fencing, Water & Tanks, Tools, Safety Equipment, General Hardware, Other.
3. The five Phase 1 public tables are `users`, `customer_profiles`, `supplier_profiles`, `product_categories` and `audit_logs`.
4. Row Level Security (RLS) was **enabled and checked on all five tables**.
5. **No RLS policies were created**, and table privileges were **revoked from the `anon` and `authenticated` roles**. This is a default-deny arrangement.
6. Supabase Auth is configured with email enabled, email confirmation enabled and anonymous sign-ins disabled. The application enforces a minimum password length of 10 characters in its own validation. No other Supabase Auth settings are recorded here.

What items 4 and 5 do not prove: default-deny RLS stops the public Supabase API from reading or writing these tables. It does not on its own prove that the complete application is secure. Server-side authorization, input validation, session handling and secret handling are separate controls, and the live sign-up and sign-in flows are not yet confirmed (see below).

## Outstanding

1. **Prisma migration-history status: conflicting evidence, to be reconciled.** The owner reported on 2026-10-21 that the migration is not recorded in `_prisma_migrations`. The 2026-10-24 handover reports one completed, non-rolled-back record. Run the read-only checks in `docs/sql/phase1-readonly-checks.sql` (Result 1) and use the decision table in docs/PHASE_1_VERIFICATION_REPORT.md section 5.4. If a record exists and its checksum matches the repository file, **no baseline is needed**. **Only if the check shows no record**, the intended operation (owner approval first, after the read-only checks) is:

   ```
   npx prisma migrate resolve --applied 20261005000000_phase1_foundation
   ```

   It records the existing migration as applied. It is not intended to run the migration SQL again.
2. **Safe verification of Prisma connectivity and migration status** against the live database, using read-only commands first (procedure in docs/SETUP_SUPABASE.md section 5).
3. **Live sign-up, email-confirmation and sign-in testing.** These still require confirmation. A proposed test is in the verification report section 9.
4. **Confirmation of Render deployment and production configuration.**
5. **`public._prisma_migrations` exposure (reported, not verified):** RLS disabled and `anon`/`authenticated` SELECT. A tested fix and rollback are in the verification report section 6. Needs owner approval; not applied.
6. **The database URL on Render.** A 2026-10-23 log showed "invalid port number in database URL" with no established cause. Check the current value's structure locally with `node check-env.mjs` (docs/SETUP_RENDER.md section 3). Not changed.
7. **Owner decisions on the other findings:** the dependency patch update, `X-Forwarded-For` trust, session cookies, a CSP header, leaked-password protection (verification report sections 6 and 11).

## Unconfirmed in the available evidence

- **Render deployment:** its status is unconfirmed. It is not recorded here as completed, and not recorded as definitively outstanding. The evidence available for this update does not settle it.
- Whether the live `_prisma_migrations` record exists and matches the repository file; whether Render's `DATABASE_URL` is currently valid; the live behaviour of registration, confirmation and sign-in.
- Not recorded either way: creation of the first administrator, Supabase Site URL and redirect URL configuration, the Supabase-side minimum password length setting.
- Known open items from the earlier review that are unchanged: dependency audit follow-up, a Content-Security-Policy header, and a password-reset page (a deliberate deferral).

## Warning: do not rerun the migration on the live database

Until the Prisma migration history has been reconciled (Outstanding item 1) **and the owner has approved the exact operation**, do not run any of these against the existing live database:

- `prisma migrate deploy`
- `prisma migrate dev`
- `prisma migrate reset`
- `prisma db push`

If Prisma's history does not record the migration, `migrate deploy` would try to run the migration SQL again and fail because the objects already exist. `migrate dev`, `migrate reset` and `db push` can change or erase live data. Never use the live database URL as a shadow database.

## Phase 2

Phase 2 (General marketplace data model) has **not started**. Product listings, services, quotations, orders, bookings and the other planned marketplace features are not implemented. Per docs/ROADMAP.md, Phase 2 should not begin until the Phase 1 outstanding items are resolved.

---

# Historical record: review of 2026-10-05

*Everything below is the earlier review, kept for history. It is not the current status. Statements that the migration was unapplied, the seed not run, RLS not verified on the live database and deployment not performed were accurate on 2026-10-05 and are superseded by the section above, where noted.*

Review date: 2026-10-05

**Phase 1 status then: PARTIALLY COMPLETE**

On 2026-10-05: the code, schema, migration, tests, build and documentation were done and verified as far as the authoring environment allowed. What remained could not be done without a Supabase project, a Render account, or network access to Prisma's engine downloads.

---

## 1. Initial repository findings

- GitHub `main` contained a single commit ("Create Tst1"): documentation (`README.md`, `PROJECT_REQUIREMENTS.md`, `docs/`, `handovers/`), configuration (`package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `middleware.ts`), and an empty `app/Tst1`.
- Missing: every page and API route, `lib/`, `prisma/` (schema, migration, seed), `tests/`, `.gitignore`, `.env.example`, ESLint config and a `lint` script.
- The old `middleware.ts` imported three modules that did not exist, and `package.json` ran `prisma generate` on install with no schema, so a clean install would have failed.
- `package.json` used the obsolete custom-auth stack (`bcryptjs`, `jose`).
- The working copy used for this phase also contained earlier, uncommitted implementation work (app, lib, prisma, tests). It had not been reconciled with the docs and had no recorded validation. It was reviewed against the corrected handover, kept where correct, and completed.

## 2. Corrections

- Custom password and JWT authentication removed in favour of Supabase Auth (`bcryptjs`, `jose` removed).
- Docs rewritten so Phase 1 is described as implemented and later phases as planned. Obsolete statements about the application hashing passwords removed.
- `PROJECT_REQUIREMENTS.md` moved to `docs/`; `app/Tst1` removed.
- Added the tests that code comments already referred to (static security checks) and the setup guides the seed script referred to.
- Fixed three TypeScript errors in the test helper (`tests/fake-db.ts`). All tests mock Prisma, so no test builds a real database client.

## 3. Implementation (what exists now)

Registration (customer, supplier), sign in, sign out, `/auth/callback`, three role dashboards, `GET /api/users/me`, `GET /api/admin/users` (ADMIN only), middleware, security headers, rate limiting, audit log foundation, web manifest, error/loading/not-found pages. Nothing from Phase 2 or later exists (a test asserts there are no product, RFQ, quotation, order or project routes).

## 4. Database

Five tables: `users`, `customer_profiles`, `supplier_profiles`, `product_categories`, `audit_logs`.

**Migration status on 2026-10-05 (HISTORICAL, superseded 2026-10-21): generated but unapplied to Supabase.** The migration SQL has since been applied manually to the live Supabase database. See "Current status" at the top of this file.

The migration SQL (`prisma/migrations/20261005000000_phase1_foundation`) was written by hand because Prisma's schema engine could not be downloaded here, so `prisma migrate diff` did not run. Instead:

- It was applied to a real **PostgreSQL 16.15** with simulated `anon` and `authenticated` roles. It ran with no errors.
- Result in that local PostgreSQL 16 test database (not Supabase): RLS enabled on all 5 tables; 0 policies; no privileges for `anon` or `authenticated`; foreign keys only between the app tables (none to the `auth` schema); no column matching pass/hash/token/secret; the lowercase-email CHECK rejected `Mixed@Case.com`.
- Prisma's own data model (`Prisma.dmmf`) was compared with the migrated database: tables, every column, nullability, enum values and unique indexes all match.

Not verified on 2026-10-05 (HISTORICAL): `prisma migrate diff` (needs the engine), applying to Supabase itself, and running the seed. Applying to Supabase and running the seed have since been done and reported as verified (see "Current status"). `prisma migrate diff` and the Prisma migration-history baseline remain outstanding.

## 5. Authentication

Supabase Auth with `@supabase/ssr` cookies. Identity is checked with `getUser()`; a test asserts the code never calls `getSession()`. Registration does not depend on a session, so email confirmation works. Profile creation is idempotent and recoverable. Live behaviour against a real Supabase project is **not yet confirmed** (see "Current status"); all Supabase calls are mocked in the automated tests.

## 6. Security

- **Role authority:** database `users.role`; never client input or `user_metadata` (tests cover metadata claiming ADMIN).
- **Authorization:** middleware (identity) plus per-page and per-API checks (role). Wrong role: pages redirect to the user's own dashboard, APIs return 403; signed out: pages redirect to login, APIs return 401.
- **RLS:** enabled on all tables, no policies, privileges revoked (see section 4). On 2026-10-05 the live check on Supabase was still to be done (SETUP_SUPABASE.md section 6). It has since been done and reported as verified (see "Current status").
- **Secrets:** none committed; `.env*` git-ignored; tests scan source for hard-coded JWTs, database URLs and keys; the service-role key is imported by one server route only.
- **Rate limiting:** in memory, per instance, resets on restart. Not distributed protection.
- **CSRF:** same-origin check on all state-changing routes.
- **Known gaps:** no Content-Security-Policy header yet; no password-reset page; no email rate limiting beyond Supabase's own; the first `getUser()` network call adds latency to every protected request.

### Dependency audit (`npm audit`)
12 findings (3 moderate, 9 high, 0 critical). Production tree: 5 (Next's bundled PostCSS, and Prisma CLI's `@prisma/config` / `deepmerge-ts`). The rest sit in lint and test tooling. These are build-time or CLI-time packages, not code that handles untrusted input in the running app. The suggested automatic fixes are a major Next upgrade or a Prisma downgrade, so none was applied. Re-run `npm audit` after each dependency update and upgrade Next when a patched 15.x is available.

## 7. Testing (actual results, 2026-10-05)

| Command | Result |
|---|---|
| `npm install` | exit 0 |
| `npx prisma validate` | exit 0: schema valid |
| `npx prisma generate` | exit 0: client v6.19.3 generated |
| `npm run lint` | exit 0, no warnings |
| `npm run typecheck` | exit 0 |
| `npm test` | exit 0: **8 files, 109 tests passed** |
| `npm run build` | exit 0: compiled, 14 routes generated |
| `migration.sql` on PostgreSQL 16 | applied cleanly; checks in section 4 |
| Production smoke test (`next start`, fake Supabase values) | public pages 200; protected pages redirect signed-out users to `/login?next=...`; protected APIs return 401; cross-origin POST returns 403; register rejects a `role` field with 400; security headers present; manifest served |

**Caveat on Prisma commands:** the sandbox blocks `binaries.prisma.sh` (HTTP 403), so Prisma's real engine binaries could not be downloaded. `validate`, `generate`, `install` (via `postinstall`), `lint`, `typecheck`, `test` and `build` were run with `PRISMA_SCHEMA_ENGINE_BINARY` and `PRISMA_QUERY_ENGINE_LIBRARY` pointing at empty stub files. Types and schema validation are real; the engines themselves were never exercised. During `build`, Prisma logged "engine not compatible" messages caused by the stub; the build still succeeded. On a normal machine or on Render, engines download normally and these messages should not appear. That is expected but was not observed.

Not tested on 2026-10-05 (HISTORICAL): real Supabase sign-up and sign-in, real email confirmation, the Prisma runtime against a database, the seed script, and deployment. The seed has since been reported as run successfully. Live sign-up, email confirmation and sign-in, Prisma connectivity and deployment remain unconfirmed (see "Current status").

## 8. Remaining manual setup (project owner) - HISTORICAL list of 2026-10-05

*Superseded. Since this list was written: the Supabase project exists (item 1); the migration SQL was applied manually (item 3, not through `prisma migrate deploy`); and RLS was checked on the live database (item 4). Item 2 is only partly recorded: email confirmation is on, but the Site URL, redirect URLs and the Supabase-side password length setting are not recorded. The current outstanding list is at the top of this file. Do not follow item 3: running `prisma migrate deploy` against the existing live database is unsafe until the Prisma migration history is baselined.*

1. Create the Supabase project and collect URL, anon key, service-role key and connection strings (docs/SETUP_SUPABASE.md sections 1 to 3).
2. Configure Authentication: confirm email, minimum password length 10, Site URL and redirect URLs (section 4).
3. On your own computer: `npm install`, create `.env`, run `npx prisma migrate deploy` and `npm run db:seed` (section 5). Optionally run `prisma migrate diff` first.
4. Verify RLS live (section 6).
5. Register yourself, confirm the email, and promote to ADMIN with the SQL in section 7.
6. Create the Render web service and set environment variables; add the Render `/auth/callback` URL to Supabase (docs/SETUP_RENDER.md).
7. Walk through the post-deploy checks in SETUP_RENDER.md section 6.
8. The Phase 1 implementation has now been uploaded to GitHub `main` through the ZIP-inbox workflow.

## 9. Architecture status

GitHub, Render, Next.js, Supabase (Auth, PostgreSQL, Storage), Prisma: implemented in code and documented. On 2026-10-05 it was not deployed. Current deployment status is unconfirmed (see "Current status").

## 10. Deferred decisions

Password-reset UI; Content-Security-Policy; shared rate-limit store; `prisma.config.ts` migration (Prisma 7 will drop `package.json#prisma`; moving now would stop Prisma auto-loading `.env`); storage buckets and policies (when uploads arrive); phone-number uniqueness (not enforced).

## 11. Known risks for later phases

Supplier adoption, price staleness (show update dates), product equivalence, low bandwidth (no external assets today), PostgreSQL-based search first. See the earlier review notes in DECISIONS.md and ARCHITECTURE.md Part B.

## 12. Recommended next phase (HISTORICAL, 2026-10-05)

*The roadmap has since changed: Phase 2 is now "General marketplace data model" and has not started (see docs/ROADMAP.md).*

Phase 2 (then called Supplier Portal), **after** the manual setup above is done and the live sign-up flow has been tested once against a real Supabase project. Do not start Phase 2 before that: untested live behaviour in Phase 1 would carry into every later phase.

## Review rule

After each major phase, update this document with what worked, what failed, security and performance concerns, UX problems, required architecture changes and deferred decisions.

## Phase 2 branch review status (2026-10-31)

A provider-foundation implementation is on `feature/phase-2-provider-foundation`. Review branch only; migration not applied to any database and no live RLS, Supabase or Render settings changed. See `handovers/PHASE_2_PROVIDER_FOUNDATION_REPORT.md` for validation evidence and limitations.
