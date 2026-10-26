# Claude Handover: Phase 1 Completion and Stabilisation

**Project:** PNG Marketplace  
**Repository:** `JennyJoshua/png-materials-marketplace`  
**Phase:** 1 — Foundation  
**Handover date:** 2026-10-24  
**Working branch:** `handover/phase-1-stabilisation-2026-10-24`  
**Priority:** Stabilise and verify Phase 1 before any Phase 2 implementation.

## 1. Your mission

Inspect the current repository and the available project evidence, then complete a careful Phase 1 stabilisation pass. Investigate the registration/login/database issues, check application security, reconcile Prisma migration history with the actual database, run tests, and correct documentation so that it accurately distinguishes verified facts from assumptions.

This is **not** authorisation to start Phase 2 or to make unapproved changes to the live production database, Render settings, Supabase settings, or credentials.

The product scope is a general Papua New Guinea goods-and-services marketplace. Building materials were the starting point, but the planned platform also supports retailers, individual service providers, and providers offering both goods and services. Phase 2 is a design-first general marketplace data model. Do not implement that phase during this handover.

## 2. Evidence from the latest read-only inspection

Treat these as observed findings that must be revalidated where possible; do not assume the situation is unchanged.

### Repository and hosting
- Next.js App Router application hosted on Render, with Supabase Auth and Supabase PostgreSQL accessed through Prisma.
- Render service URL: `https://png-materials-marketplace.onrender.com`.
- Render service is configured to deploy from `main`; recent available deployment evidence showed a live deployment after commit `37ad8f702d76d72f5c40cb1c9630d5257171546f`. Verify the current deployment rather than assuming this is still the latest.
- Environment variable names used by the app include `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and optionally `NEXT_PUBLIC_SITE_URL`. Never print or commit their values.
- The app's registration path calls Supabase Auth and then creates/reconciles a profile through Prisma. Login also depends on database profile synchronisation and audit logging.

### Historical Render error
Available Render logs from 2026-10-23 included this Prisma error during failed-login audit logging:

```
The provided database string is invalid.
Error parsing connection string: invalid port number in database URL.
```

The exact variable and cause were not established. Possible causes include a malformed URL, separator, port, or unescaped special characters in a password. This may have contributed to auth/profile failures, but the historical log alone does not prove the issue is still present or that it explains every registration problem.

**Required:** check the current service's variable *names/configuration presence* and verify connectivity without exposing secret values. Do not ask the owner to paste secrets into chat or logs. If a secret must be changed, stop and request owner approval; explain how to replace it safely without revealing the current value.

### Live Supabase database findings
Project reference: `upsnqffflxpsvqexascf`. Do not print credentials.

At the last inspection:
- `public.users`: 2 rows; RLS enabled; no direct SELECT privilege for `anon`/`authenticated`.
- `public.customer_profiles`: 2 rows; RLS enabled; no direct SELECT privilege for `anon`/`authenticated`.
- `public.supplier_profiles`: 0 rows; RLS enabled; no direct SELECT privilege for `anon`/`authenticated`.
- `public.product_categories`: 15 rows; RLS enabled; no direct SELECT privilege for `anon`/`authenticated`.
- `public.audit_logs`: 12 rows; RLS enabled; no direct SELECT privilege for `anon`/`authenticated`.
- The five application tables have no RLS policies. This is currently a deliberate default-deny arrangement; server-side Prisma is expected to access them. Do not add permissive policies merely to clear an advisor warning.
- `public._prisma_migrations`: one completed migration record for `20261005000000_phase1_foundation`; RLS was disabled and `anon`/`authenticated` had SELECT privileges at the time of inspection.
- Supabase Auth had two identities, one email-confirmed.
- User records included one ACTIVE CUSTOMER and one PENDING CUSTOMER; no supplier or admin records.
- Audit events included `USER_REGISTERED` (1), `PROFILE_CREATE_FAILED` (1, DB_ERROR), `PROFILE_RECOVERED` (1), `USER_LOGIN_FAILED` (7), `USER_LOGIN` (1), and `USER_LOGOUT` (1). These counts include historical events and do not prove current behaviour.

### Supabase advisor findings
1. Informational: RLS enabled but no policy on the five application tables. This can be intentional default-deny; evaluate the complete server-side access model rather than adding blanket policies.
2. Error: RLS disabled on `public._prisma_migrations`.
3. Warning: leaked-password protection disabled.

The appropriate likely remediation for `_prisma_migrations` is to enable RLS and revoke unnecessary `anon`/`authenticated` privileges while preserving the owner/migration runner's required access. **Do not execute production SQL without explicit owner approval.** Recommend enabling Supabase leaked-password protection and checking the Supabase password settings against the application's 10-character minimum, but do not change live settings without approval.

### Migration-history discrepancy
The current `docs/REVIEW.md` and `README.md` say the Prisma migration baseline is outstanding / not recorded. The live `public._prisma_migrations` table instead contained one completed, non-rolled-back record for `20261005000000_phase1_foundation`. Documentation is therefore stale or incomplete. Reconcile it with read-only checks before recommending any operation.

Do not confuse the Prisma `_prisma_migrations` table with Supabase's separate migration listing.

## 3. Non-negotiable safety boundaries

- **Never** run `prisma migrate reset` against production.
- Do not run `prisma migrate deploy`, `prisma migrate dev`, `prisma db push`, or the original migration SQL against production until schema and migration history have been reconciled and the owner explicitly approves the exact operation.
- Do not drop, truncate, recreate, or bulk-edit production tables or users.
- Do not change Render environment secrets, database URLs, Supabase Auth settings, RLS, privileges, or production SQL without explicit owner approval.
- Do not reveal secret values, service-role keys, passwords, or full database URLs in reports, commits, logs, screenshots, or test output.
- Do not create live test accounts or trigger production emails unless the owner has approved the test and understands its effects. Prefer local/test environments. If live acceptance testing is essential, provide the proposed test steps and ask for approval first.
- Do not add permissive RLS policies to silence warnings.
- Do not claim a test passed unless you ran it and have evidence. Separate automated test results, static review, live observations, and unverified assumptions.
- Do not begin Phase 2 features in this task.
- Do not add paid services, paid APIs, or paid dependencies.
- Do not merge to `main`, trigger a production release, or deploy unreviewed changes. Work on the assigned branch and return a reviewable diff/ZIP or pull request.
- If a required tool, environment, preferred model, or permission is unavailable, stop and report the blocker rather than silently substituting an unapproved approach.

## 4. Work plan

### Task A — Establish current state
1. Read `README.md`, `PROJECT_REQUIREMENTS.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/ROADMAP.md`, `docs/REVIEW.md`, setup guides, Prisma schema/migrations, and auth routes/tests.
2. Inspect the current branch/commit and deployment evidence if accessible.
3. Record which evidence is from source code, automated tests, Render logs, Supabase inspection, or owner-reported history.
4. Do not infer that a missing log entry means a request succeeded.

### Task B — Diagnose registration, login, and profile recovery
Review at least:
- `app/api/auth/register/route.ts`
- `app/api/auth/login/route.ts`
- auth callback and session handling
- profile synchronisation/recovery functions
- Prisma datasource/environment configuration
- audit-log failure handling
- role checks and dashboard access guards
- validation, rate limiting, and tests

Trace the complete flows and identify failure points. In particular, determine whether a Prisma/database failure can turn an otherwise successful Supabase Auth operation into an incomplete profile or misleading UI result. Make code changes only where supported by evidence and add regression tests. Never log secrets.

Acceptance scenarios to cover in automated tests where feasible:
1. Registration validation rejects invalid input and weak passwords according to project rules.
2. Supabase sign-up success leads to a correctly created/reconciled profile, or a safe, recoverable error.
3. Duplicate registration is handled clearly.
4. Email-confirmation-required accounts are handled correctly.
5. Correct login works for a confirmed account.
6. Wrong-password and unconfirmed-account errors are safe and understandable.
7. Profile recovery does not create duplicate users/profiles.
8. Role-based dashboards/routes reject unauthorised roles.
9. Logout/session behaviour is correct.
10. Audit-log failure does not expose secrets or create a misleading success/failure state.

Do not invent a successful live acceptance test if you cannot safely run it. State exactly what remains to be tested by the owner.

### Task C — Verify database URL handling safely
- Inspect the code and documentation to establish which Prisma datasource uses `DATABASE_URL` and `DIRECT_URL`.
- Check Render variable names and presence, not values, if tool access permits.
- Use a safe, non-printing connection check in an approved non-production/local context if available.
- Check that parsing errors are surfaced without printing the connection string.
- If production variables appear wrong, do not modify them. Report the suspected variable by name, explain the safe correction procedure, and request owner approval.

### Task D — Reconcile Prisma migration history and schema
- Inspect `prisma/schema.prisma`, the migration SQL, generated Prisma expectations, and the live migration record using read-only inspection where available.
- Determine whether the live schema matches the migration and whether the recorded migration checksum matches the repository file, if that evidence is available.
- Explain the discrepancy between the existing docs and the live migration record.
- Do not run a baseline/resolve or migration command against production without owner approval.
- Provide a proposed, exact, reversible-as-possible next step for the owner to approve. If safe validation cannot be performed, state what evidence is missing.

### Task E — Security review
Review server-side role authorization, use of the Supabase service-role key, session/cookie handling, input validation, rate limiting, audit logs, public database grants, RLS, security headers, dependency audit, and password reset status.
- Keep the five application tables default-deny unless a documented access requirement justifies a narrowly scoped policy.
- Flag `public._prisma_migrations` RLS/privilege exposure as a production security finding and propose minimal remediation; do not execute it without approval.
- Flag leaked-password protection as a recommended Supabase setting; do not change it without approval.
- Avoid broad refactors unrelated to Phase 1 completion.

### Task F — Tests and build
Run the repository's documented install, test, lint/typecheck, and production build commands where the environment supports them. Report the exact command and result for each. Distinguish unavailable tooling/network from a failing test. Add focused regression tests for defects fixed. Do not delete or weaken existing tests just to obtain a green result.

### Task G — Documentation
Update only after evidence is gathered. Review and correct relevant sections in:
- `docs/REVIEW.md`
- `README.md`
- `docs/SETUP_RENDER.md`
- `docs/SETUP_SUPABASE.md`
- `CHANGELOG.md` (if present)
- `handoff.md` (if present)

Preserve historical notes, but mark them as superseded where necessary. Do not state that migration baselining, production auth tests, or security changes are complete unless they are proven complete. Record unresolved owner approvals as blockers.

## 5. Deliverables

Return:
1. Code changes and regression tests, with a concise rationale for each fix.
2. Updated documentation reflecting actual evidence.
3. A Phase 1 verification report with:
   - observed facts;
   - tests run and exact results;
   - live checks performed and date/time;
   - security findings by severity;
   - items not tested and why;
   - production changes made (ideally none without approval);
   - owner decisions required.
4. A migration reconciliation note stating what was checked and what exact action, if any, still needs approval.
5. Updated `CHANGELOG.md` and `handoff.md` if those files are part of the repo's current convention.
6. A short handover back to ChatGPT: changed files, commit/branch/PR or ZIP location, test evidence, unresolved issues, and your recommended next step.

## 6. Definition of Phase 1 complete

Do not mark Phase 1 complete until all applicable items below are supported by evidence:
- Database URL/connectivity is verified without exposing secrets.
- Registration, email-confirmation handling, login, logout, profile creation/recovery, and role protection are tested.
- Migration history and actual schema are reconciled without unsafe migration execution.
- Security findings are either remediated with approval or explicitly accepted/deferred by the owner.
- Automated tests, type/lint checks, and production build have recorded results.
- Setup/review docs match the current repository and live-state evidence.
- The owner has reviewed the report and explicitly approved any required live changes.

## 7. Next phase — not authorised yet

After Phase 1 is accepted, prepare a separate **design-only Phase 2 handover** for the general marketplace data model. It should specify one account supporting buyer and provider capabilities, provider types (goods, services, or both), PNG-relevant locations, category hierarchy, provider verification/status, access-control/RLS approach, constraints/indexes, migration strategy, and tests. Do not implement product/service listings, search, RFQs, quotations, orders, bookings, payments, delivery, or AI features in this stabilisation task.

**Required workflow:** Inspect → Reconcile → Specify → Obtain approval → Implement → Secure → Test → Document → Report.
