# Phase 2 — Provider Foundation Implementation Report

Date: 2026-10-31  
Repository: `JennyJoshua/png-materials-marketplace`  
Base: `main` at `b83da5417e596534a21f0194c6d024f7b9453a2b` (includes merged logout redirect fix PR #8)  
Branch: `feature/phase-2-provider-foundation`  
Deployment: not merged or deployed. No production database or settings accessed.

## Summary

Adds one optional provider profile per application user; individual/business kind; products/services/both capability; PNG primary location; owner create/read/edit; administrator status and verification controls; and separate service categories. Does not implement listings, search, transactions, bookings, quotes, payments or uploads.

## Files changed/new

- `prisma/schema.prisma`
- `prisma/migrations/20261031000000_phase2_provider_foundation/migration.sql`
- `prisma/service-categories.ts`, `prisma/seed.ts`
- `lib/validation/provider.ts`, `lib/security/audit.ts`
- `app/api/providers/me/route.ts`, `app/api/admin/providers/route.ts`
- `app/provider/profile/page.tsx`, `app/provider/profile/ProviderProfileForm.tsx`
- `app/admin/providers/page.tsx`, `app/admin/providers/ProviderAdminList.tsx`
- `components/AppShell.tsx`
- `tests/provider-validation.test.ts`, `tests/provider-security-static.test.ts`, `tests/provider-routes.test.ts`, `tests/static-security.test.ts`
- `docs/DATABASE.md`, `docs/ARCHITECTURE.md`, `docs/PROJECT_REQUIREMENTS.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md`, `docs/REVIEW.md`, `docs/CHANGELOG.md`
- `handovers/PHASE_2_PROVIDER_FOUNDATION_REPORT.md`

## Schema and compatibility

New enums: `ProviderKind`, `ProviderType`, `ProviderStatus`, `ProviderVerificationLevel`. New tables: `provider_profiles`, `service_categories`. Provider profile owner is unique and references `users.id`; optional verifier references `users.id`. A check constraint requires verifier and timestamp for non-UNVERIFIED levels. Indexes cover status/date, verification, location and display name.

Legacy `supplier_profiles` records are deliberately untouched. The old `VerificationStatus` values do not safely prove the new provider status or evidence level. No guessed backfill is performed. Existing SUPPLIER role and all role values remain unchanged. `product_categories` and its existing records remain unchanged. Service category seed uses upsert with empty update, preserving administrator edits.

## Authorization and security

Owner API uses `requireApiAccess()` (Supabase `getUser()` and authoritative database user status/role) and scopes all profile reads/writes by verified `user.id`. Client user IDs and status/verification claims are not accepted. Creation is limited to ACTIVE accounts and creates PENDING_REVIEW / UNVERIFIED. Owners cannot activate, suspend, self-verify or unsuspend. Suspended provider profiles cannot be edited through owner API. Admin API uses database-backed ADMIN guard, rejects self-review, and records safe status/verification audit metadata.

Migration enables RLS on both new public tables, creates no policies, and revokes all privileges from `anon` and `authenticated` where those roles exist. No changes to `_prisma_migrations`, Phase 1 migration SQL, production database, Supabase or Render settings.

## Validation evidence

- `npx prisma validate`: PASS (non-secret placeholder DATABASE_URL/DIRECT_URL used only for schema parsing).
- `npx prisma generate`: PASS (Prisma Client 6.19.3 generated).
- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm test`: PASS, 216 tests across 18 files. Two Phase 1-only static assertions were updated to scope their assertions to the frozen Phase 1 migration and to expect the Phase 2 schema additions; no tests were deleted or weakened. New provider tests cover input validation, owner/admin API route behavior, owner scoping, suspended-provider edit blocking, self-review blocking, audit calls, service-seed idempotence and migration security invariants. They do not replace a live integration test against Supabase.
- `npm ci`: PASS (exit 0; npm emitted install-script approval notices, so Prisma client generation was run explicitly afterward).
- `npm run build`: PASS (Next.js production build completed; provider and admin routes included).
- Migration SQL was not executed against PostgreSQL or production; live RLS was not checked.

## Limitations and owner review

1. Legacy supplier profiles are not backfilled; review a safe mapping separately.
2. Admin list is capped at 100; moderation screen is intentionally minimal.
3. Service categories are seeded but not yet assigned to providers; association is deferred.
4. Only primary province/district/town is stored; multiple service areas are deferred.
5. No public provider endpoint exists. Future display must filter ACTIVE and select safe public fields.
6. Before merge: complete `npm ci`, lint, typecheck, tests, Prisma validate/generate, build; inspect migration against scratch PostgreSQL; review diff.
7. Owner must approve and apply migration separately after review. Do not upload ZIP to automatic `_inbox`; it commits to `main` and may trigger Render deployment.
## Review corrections (2026-11-01)

Following independent review of draft PR #9:

- Editing an ACTIVE provider profile now moves it to PENDING_REVIEW. Its verification level and verifier evidence are retained as a separate record; administrator review is required before the profile is active again.
- Provider profile creation, owner edits, administrator status changes and verification changes now write their audit records inside the same PostgreSQL transaction as the data change. Audit insertion errors abort the transaction rather than being swallowed for these provider operations.
- Owner and administrator update transactions use SERIALIZABLE isolation.
- Added regression tests for active-profile review reset and audit failure propagation; static security assertions now tolerate formatting changes.

Validation rerun in ATL Sandbox against the updated branch:
- `npm ci`: PASS.
- `npm test`: PASS, 219 tests across 18 files.
- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npx prisma validate`: PASS.
- `npx prisma generate`: PASS.
- `npm run build`: PASS.
- Scratch PostgreSQL 15 migration check: PASS. Applied Phase 1 then Phase 2 SQL to a fresh disposable local database with `anon` and `authenticated` roles present. Both new tables report RLS enabled; `has_table_privilege` returned false for SELECT on both new tables for the `anon` role and on `provider_profiles` for `authenticated`. No production database was used.

The scratch migration test confirms the SQL applies cleanly after the repository's Phase 1 migration on PostgreSQL 15. It does not replace validation against the exact Supabase production environment. No production migration, merge, or deployment was performed.
