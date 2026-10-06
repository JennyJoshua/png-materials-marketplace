# Project Review

Version: 0.1.0
Phase: Phase 1 (Foundation)
Review date: 2026-10-05

**Phase 1 status: PARTIALLY COMPLETE**

The code, schema, migration, tests, build and documentation are done and verified as far as this environment allows. What remains cannot be done without a Supabase project, a Render account, or network access to Prisma's engine downloads. See "Remaining manual setup".

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

**Migration status: GENERATED BUT UNAPPLIED to Supabase.**

The migration SQL (`prisma/migrations/20261005000000_phase1_foundation`) was written by hand because Prisma's schema engine could not be downloaded here, so `prisma migrate diff` did not run. Instead:

- It was applied to a real **PostgreSQL 16.15** with simulated `anon` and `authenticated` roles. It ran with no errors.
- Result in the live database: RLS enabled on all 5 tables; 0 policies; no privileges for `anon` or `authenticated`; foreign keys only between the app tables (none to the `auth` schema); no column matching pass/hash/token/secret; the lowercase-email CHECK rejected `Mixed@Case.com`.
- Prisma's own data model (`Prisma.dmmf`) was compared with the migrated database: tables, every column, nullability, enum values and unique indexes all match.

Not verified: `prisma migrate diff` (needs the engine), applying to Supabase itself, and running the seed.

## 5. Authentication

Supabase Auth with `@supabase/ssr` cookies. Identity is checked with `getUser()`; a test asserts the code never calls `getSession()`. Registration does not depend on a session, so email confirmation works. Profile creation is idempotent and recoverable. Live behaviour against a real Supabase project is **untested**; all Supabase calls are mocked in the tests.

## 6. Security

- **Role authority:** database `users.role`; never client input or `user_metadata` (tests cover metadata claiming ADMIN).
- **Authorization:** middleware (identity) plus per-page and per-API checks (role). Wrong role: pages redirect to the user's own dashboard, APIs return 403; signed out: pages redirect to login, APIs return 401.
- **RLS:** enabled on all tables, no policies, privileges revoked (see section 4). Live check on Supabase remains manual (SETUP_SUPABASE.md section 6).
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

Not tested: real Supabase sign-up and sign-in, real email confirmation, the Prisma runtime against a database, the seed script, and deployment.

## 8. Remaining manual setup (project owner)

1. Create the Supabase project and collect URL, anon key, service-role key and connection strings (docs/SETUP_SUPABASE.md sections 1 to 3).
2. Configure Authentication: confirm email, minimum password length 10, Site URL and redirect URLs (section 4).
3. On your own computer: `npm install`, create `.env`, run `npx prisma migrate deploy` and `npm run db:seed` (section 5). Optionally run `prisma migrate diff` first.
4. Verify RLS live (section 6).
5. Register yourself, confirm the email, and promote to ADMIN with the SQL in section 7.
6. Create the Render web service and set environment variables; add the Render `/auth/callback` URL to Supabase (docs/SETUP_RENDER.md).
7. Walk through the post-deploy checks in SETUP_RENDER.md section 6.
8. Push this code to GitHub. **`main` on GitHub still holds only the original files until you upload these.**

## 9. Architecture status

GitHub, Render, Next.js, Supabase (Auth, PostgreSQL, Storage), Prisma: implemented in code and documented. Not deployed.

## 10. Deferred decisions

Password-reset UI; Content-Security-Policy; shared rate-limit store; `prisma.config.ts` migration (Prisma 7 will drop `package.json#prisma`; moving now would stop Prisma auto-loading `.env`); storage buckets and policies (when uploads arrive); phone-number uniqueness (not enforced).

## 11. Known risks for later phases

Supplier adoption, price staleness (show update dates), product equivalence, low bandwidth (no external assets today), PostgreSQL-based search first. See the earlier review notes in DECISIONS.md and ARCHITECTURE.md Part B.

## 12. Recommended next phase

Phase 2 (Supplier Portal), **after** the manual setup above is done and the live sign-up flow has been tested once against a real Supabase project. Do not start Phase 2 before that: untested live behaviour in Phase 1 would carry into every later phase.

## Review rule

After each major phase, update this document with what worked, what failed, security and performance concerns, UX problems, required architecture changes and deferred decisions.
