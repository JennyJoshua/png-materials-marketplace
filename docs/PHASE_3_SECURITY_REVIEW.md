# Phase 3 — Security and validation review

Date: 2026-11-01  
Branch: `feature/phase-3-product-marketplace`  
Review status: implementation review in progress; runtime validation pending.

## Database and data integrity

- Product listings use provider-owned rows; the provider profile ID is derived from the verified application user on the server and is never accepted in create/update payloads.
- Product price uses PostgreSQL `NUMERIC(12,2)` and Prisma `Decimal`; request prices are decimal strings, not JavaScript floating-point values.
- Database checks enforce positive price and non-empty name/unit.
- Provider and category foreign keys use `ON DELETE RESTRICT`, preserving listings and preventing accidental deletion of referenced records.
- Category deactivation preserves listings and suppresses them from public results.
- Migration is additive and does not alter or backfill existing supplier/provider/category data.
- Product listing table has RLS enabled, no permissive policies, and privileges revoked from `PUBLIC`, `anon` and `authenticated`. The application uses server-side Prisma and must enforce authorization in every route.

## Authentication and authorization

- All provider endpoints call `requireApiAccess`, which verifies Supabase identity and loads the authoritative application user from the database.
- Provider profile is looked up by the authenticated user's database ID. Client-supplied provider IDs are ignored.
- Provider listing management requires an ACTIVE application user and ACTIVE provider profile. A SERVICES-only provider cannot create or publish product listings.
- Provider item reads and writes are scoped by both listing ID and owned provider profile ID.
- Administrator category and moderation endpoints require database-authorized ADMIN role via `requireApiAccess(["ADMIN"])`.
- Public endpoints expose only ACTIVE listings whose provider and category are also ACTIVE.
- Public provider summary omits internal user IDs, business registration number, street address and other non-public profile fields. Only the provider's designated public contact fields and public location summary are selected.

## Validation and business rules

- Request bodies use strict Zod schemas; unknown client-supplied fields are rejected.
- Price is a decimal string with at most two fractional digits and a positive value.
- Listing status, timestamps, provider ownership, verification level and moderation state cannot be supplied by providers.
- Price and stock timestamps are updated only when the corresponding values actually change.
- Publication requires an active category and valid price/unit; publication and archive actions are audited.
- Category changes are audited. Categories are deactivated rather than deleted.
- Admin moderation requires a reason; only suspended listings may be restored, and restore is blocked if provider/category is inactive.

## Search and exposure controls

- Public search is bounded to at most 50 results per page and 10,000 pages.
- Search fields are limited to name, brand and specification; supported filters are category, provider, province, district, stock, price range and sort.
- No raw database error or internal user record is included in public result objects.
- Search uses PostgreSQL case-insensitive matching and indexed category/status/price/name fields. Further query-plan/index tuning should be based on actual catalogue size and query plans.

## Outstanding verification (must be completed before merge)

1. Run `prisma validate` and `prisma generate` using the repository's locked dependencies.
2. Apply all migrations, including Phase 3, to a disposable PostgreSQL database with Supabase-compatible `anon` and `authenticated` roles.
3. Verify foreign keys, positive-price checks, RLS enabled, no policies, and grants for `PUBLIC`, `anon` and `authenticated`.
4. Run all Vitest tests, lint, TypeScript typecheck and Next.js production build.
5. Add/execute route-level tests for owner isolation, inactive provider/category exclusion, admin-only moderation and audit records.
6. Inspect the full branch diff and verify no production environment or database was used.

No production migration, deployment, merge or live database access is authorized by this review.
