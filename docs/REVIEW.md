# Project Review

Version: 0.2.0  
Current phase: Phase 3 — Product marketplace  
Status last updated: 2026-11-01

**Current overall position:** Phase 1 foundation remains implemented with some historical verification items open; Phase 2 provider foundation is merged to `main` and its production migration was owner-reported as applied and verified; Phase 3 backend implementation is complete and validated on a feature branch, with draft PR #13 awaiting owner review. No Phase 3 production migration, merge or deployment has occurred.

This current-status section supersedes stale statements in the historical review below. Historical findings are retained for auditability and must not be treated as current without checking their date and evidence.

## Evidence and scope

- Repository reviewed: `JennyJoshua/png-materials-marketplace`, `main`.
- Latest inspected main commit: merge commit `8f4f7a8032e6d6384c0a5e5ebe67346aa7901c21`, merging PR #12, “Fix provider verifier deletion integrity” (2026-11-01).
- Main contains the Phase 2 provider schema and `prisma/migrations/20261101000000_provider_verifier_integrity/migration.sql`.
- The owner-confirmed project handover records that the provider migration was applied and verified in production, with `provider_profiles.verified_by_user_id` using ON DELETE RESTRICT and an index. The last reported provider_profiles count was zero; 12 active service categories were seeded.
- The owner confirmed on 2026-11-01 that production login works after correcting Render's Supabase pooler URL to include the `/postgres` database path, and that subsequent health checks were all good.
- GitHub repository evidence establishes what is on `main`; it does not by itself prove live database or Render state. Live statements above are explicitly attributed to owner-confirmed reports.

## Phase 1 — Foundation

**Status: Implemented; partially complete as a verification record.**

The app is deployed and the owner has confirmed successful login and healthy post-fix checks. The earlier live Supabase checks reported in the historical record remain useful but are not a substitute for current evidence.

Still open or not freshly evidenced in the available record:
1. Reconcile Phase 1 Prisma migration history against the live `_prisma_migrations` record and migration checksum.
2. Record a complete live sign-up and email-confirmation test, if not already completed since the earlier review.
3. Reconfirm remaining Supabase configuration and security findings, including the reported `_prisma_migrations` exposure and leaked-password protection.
4. Revisit dependency audit, trusted-proxy/IP handling and CSP/password-reset deferrals according to the existing security decision process.

The previous 2026-10-23 “invalid port number” incident is superseded as an active login blocker: the later production failure was traced to a pooler URL missing `/postgres`; the owner corrected it and confirmed login/health checks. Do not re-open or change production configuration without new evidence.

**Production safety:** no Phase 1 baseline, migration, reset, db push or other database operation is authorized by this review update.

## Phase 2 — Provider foundation

**Status: Implemented on `main`; production migration owner-reported applied and verified.**

Corrections to the previous review:
- The old statement that Phase 2 had not started is obsolete.
- The old statement that the provider foundation was only on `feature/phase-2-provider-foundation` and not merged is obsolete.
- PRs #11 and #12 were merged to `main`; PR #12 merge commit is `8f4f7a8032e6d6384c0a5e5ebe67346aa7901c21`.
- Main includes `ProviderProfile`, `ServiceCategory`, provider status/type/verification enums and the verifier-integrity migration.
- The final verifier integrity migration changes the verifier foreign key to ON DELETE RESTRICT and adds an index. Its migration and schema changes are present in the merged commit.
- The owner-confirmed deployment record says the provider migration was applied and checked in production. This is reported live evidence, not inferred from the GitHub file alone.

Phase 2 does not mean product listings or service listings have been implemented. Legacy supplier profiles were retained; no speculative backfill is claimed.

## Phase 3 — Product marketplace

**Status: Implemented and validated on a separate feature branch; awaiting owner review/merge approval.**

Approved artifacts:
- `docs/PHASE_3_PRODUCT_MARKETPLACE_SPEC.md`
- `docs/PHASE_3_IMPLEMENTATION_PLAN.md`

Approved scope includes provider-owned product listings, PGK prices, stock status, public browse/search/filter, price comparison, administrator category management and moderation. Listings are public only when the listing, provider and category are all ACTIVE. Prices are provider-entered positive NUMERIC values; no estimated prices. No cart, RFQ, order, checkout, payment, commission, image upload, variant or price-history features in this phase.

Implementation branch: `feature/phase-3-product-marketplace`
Draft PR: https://github.com/JennyJoshua/png-materials-marketplace/pull/13

Implemented backend:
- Provider-owned product listing create, list, edit, publish, unpublish and archive APIs.
- Public active-category list, product search/filter/detail APIs with bounded pagination.
- Administrator category management and listing moderation.
- Strict Zod validation, decimal-safe PGK prices, owner isolation, same-origin mutation checks and audit logging.

Validation evidence:
- 249 tests passed across 23 test files.
- TypeScript typecheck and Next.js production build passed.
- Prisma schema validation and client generation passed.
- All migrations applied to disposable PostgreSQL 16; Phase 3 RLS enabled, no policies, no PUBLIC/anon/authenticated grants, positive-price check and both RESTRICT foreign keys verified.
- ESLint passed.
- No production database, Render service or production credentials were used.

Security follow-up: CI reported 23 advisories in the existing locked dependency tree (16 moderate, 5 high, 2 critical). Phase 3 added no dependencies. This requires a separate dependency audit and remediation decision before release.

Release controls:
- Draft PR only; no merge to `main`.
- No production migration, environment change or Render deployment without separate owner approval.

## Current validation record

- Phase 2 verifier migration: merged; owner-reported applied and verified in production.
- Production login: owner-confirmed working after pooler URL correction.
- Post-fix application health checks: owner-confirmed all good.
- Phase 3 schema, migration, RLS/grants, tests, typecheck, lint and production build: validated on the feature branch as recorded above.
- No Phase 3 production database or deployment changes have been made.

## Review rule

After each major phase, update this document with what worked, what failed, security and performance concerns, UX problems, required architecture changes, test evidence and deferred decisions.

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
