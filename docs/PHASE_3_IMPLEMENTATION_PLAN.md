# Phase 3 — File-by-File Implementation Plan

Status: Approved design; implementation plan for review  
Repository: `JennyJoshua/png-materials-marketplace`  
Target branch: `design/phase-3-product-marketplace`  
Specification: `docs/PHASE_3_PRODUCT_MARKETPLACE_SPEC.md`

## 1. Scope and change boundary

The owner approved the Phase 3 specification and its recommended defaults on 2026-11-01.

This plan is the next planning artifact. It does not implement the marketplace. No application source, Prisma schema, migration, production database, environment variable, Render deployment, or `main` branch is changed by this document.

Implementation will take place on a separate feature branch only after the file plan and migration/RLS design are reviewed. Merge, production migration, and deployment each require separate owner approval.

## 2. Repository facts confirmed from current main

The following files were inspected on `main`:

- `prisma/schema.prisma`: contains User, ProductCategory, ProviderProfile and ServiceCategory models. ProductCategory currently has name, description, status and timestamps; it has no listing relation yet.
- `lib/auth/guards.ts`: provides `requireApiAccess` and role-based page access. It does not itself load an owned provider profile or enforce provider status for a listing operation.
- `lib/auth/session.ts`: `getAuthUser()` verifies Supabase identity; `syncAppUser()` loads the authoritative application user.
- `lib/security/audit.ts`: central audit helper and action allow-list. It already includes provider-profile actions and sanitises credential-like metadata keys.
- `prisma/categories.ts`: initial 15 building-material product categories.
- `prisma/seed.ts`: idempotently seeds product and service categories using upsert with empty updates, preserving administrator edits.
- `package.json`: Next.js 15, Prisma 6.19.x, TypeScript, Vitest; scripts include test, lint, typecheck, build, Prisma validation/generation.
- `docs/ROADMAP.md` and `docs/REVIEW.md`: still contain older statements that Phase 2 has not started / is on a review branch. These documents need a factual status reconciliation before the Phase 3 release is described as underway or complete.
- The Phase 2 verifier-integrity migration `prisma/migrations/20261101000000_provider_verifier_integrity/migration.sql` is present on main.

The exact current route/test directory inventory and the complete Phase 2 migration chain must be re-read at implementation start. Do not infer filenames from this plan or create duplicate helpers/tests.

## 3. Proposed files to add

The exact filenames below are planned names, subject to matching the repository's established naming conventions after a fresh tree inspection.

| File | Responsibility | Acceptance evidence |
|---|---|---|
| `prisma/migrations/<timestamp>_phase3_product_listings/migration.sql` | Additive PostgreSQL migration for product listings, indexes, constraints, RLS and default-deny grants | Applies cleanly to disposable PostgreSQL after all prior migrations; schema and grants verified |
| `lib/validation/products.ts` | Zod schemas for create/update/list/search/filter inputs | Unit tests reject invalid price, unit, status, lengths and untrusted fields |
| `lib/auth/provider-access.ts` | Server helper to resolve authenticated user and their ACTIVE provider profile for provider actions | Tests prove no profile, non-active profile and spoofed profile IDs are denied |
| `lib/products/queries.ts` | Server-side product listing/detail/search query functions with public visibility rules and bounded pagination | Query tests exclude non-public providers/categories/listings |
| `lib/products/mutations.ts` | Transaction-safe create/update/publish/archive/moderation operations with ownership and audit | Tests verify ownership, status transitions and audit actions |
| `app/api/products/route.ts` | Public GET listing/search endpoint | Anonymous browse, validation, filtering and pagination tests |
| `app/api/products/[id]/route.ts` | Public GET listing detail endpoint | Only public listings are returned; no private provider data leakage |
| `app/api/provider/products/route.ts` | Provider GET own listings and POST draft listing | Authenticated owner scoping and validation tests |
| `app/api/provider/products/[id]/route.ts` | Provider GET/PATCH own listing | Cross-provider IDOR tests fail safely |
| `app/api/provider/products/[id]/publish/route.ts` | Provider publication action | Only eligible ACTIVE provider can publish a complete draft |
| `app/api/provider/products/[id]/archive/route.ts` | Provider archive action | Owner-only; archived listing becomes undiscoverable |
| `app/api/admin/products/route.ts` | ADMIN listing moderation queue | Non-admin denied |
| `app/api/admin/products/[id]/moderation/route.ts` | ADMIN suspend/restore listing | Admin-only; reason and action audit-logged |
| `app/api/admin/categories/route.ts` | ADMIN list/create/update product categories | Admin-only; no destructive deletion; existing category IDs preserved |
| `tests/unit/validation/products.test.ts` | Product input validation tests | All boundary cases pass |
| `tests/unit/products/queries.test.ts` | Public visibility, filters and pagination tests | No inactive/suspended/unpublished leakage |
| `tests/unit/products/mutations.test.ts` | Ownership, status, timestamps and audit tests | No cross-provider writes |
| `tests/api/products.test.ts` | Public API contract tests | Anonymous browse and detail behaviour |
| `tests/api/provider-products.test.ts` | Provider API authorisation and CRUD tests | User A cannot access User B's listing |
| `tests/api/admin-products.test.ts` | Category and moderation authorisation tests | Only database-authorized ADMIN can mutate |
| `tests/db/phase3-product-listings.test.ts` | Disposable-PostgreSQL migration, constraints, RLS and grants checks | SQL-level checks pass on clean test database |

If the repository uses a different existing test grouping or route naming convention, reuse it rather than introducing parallel structure.

## 4. Existing files expected to change

| Existing file | Planned change | Guardrail |
|---|---|---|
| `prisma/schema.prisma` | Add ProductListing model, enums and relations to ProviderProfile and ProductCategory | Preserve all existing models, enum values, table/column mappings and relations |
| `lib/security/audit.ts` | Add narrowly scoped product/category audit action names | Keep secret-key sanitisation; do not log credentials or unnecessary personal data |
| `prisma/seed.ts` | Likely no change; use existing category seed | Do not reset categories or overwrite administrator edits |
| `prisma/categories.ts` | Only extend if an agreed non-building-material taxonomy is needed | Preserve all existing 15 categories and identifiers; avoid speculative broad taxonomy |
| `docs/ROADMAP.md` | Correct stale Phase 2 status from verified repository/deployment evidence; show Phase 3 approved/in progress only when implementation actually starts | Never claim a migration or deployment succeeded without evidence |
| `docs/REVIEW.md` | Add a dated Phase 2 status/evidence correction and later Phase 3 test evidence | Retain historical record; clearly distinguish repository state from live production verification |
| `docs/DECISIONS.md` | Record approved Phase 3 choices as a dated decision entry | Do not silently convert unrelated proposals into approved decisions |
| `docs/PROJECT_REQUIREMENTS.md` | Update status labels only if needed to reflect Phase 3 work | Do not rewrite unrelated requirements |
| `docs/ARCHITECTURE.md` | Add final product listing data/access decisions only if they differ from the approved spec | Avoid duplicating the whole specification |

## 5. Proposed database design to review before writing migration SQL

### ProductListing

Recommended fields:

- `id`: UUID primary key.
- `provider_profile_id`: required UUID FK to `provider_profiles(id)`; delete behaviour must preserve safety and historical integrity.
- `category_id`: required UUID FK to `product_categories(id)`; category deactivation must not delete listings.
- `name`: required bounded varchar.
- `brand`: nullable bounded varchar.
- `specification`: nullable bounded varchar.
- `description`: nullable bounded text.
- `unit`: required bounded varchar; accepted unit set and “Other” label validated at application boundary.
- `price`: required positive `NUMERIC(12,2)` (confirm precision with owner only if a genuine range concern appears; never use float).
- `stock_status`: enum IN_STOCK, LIMITED_STOCK, OUT_OF_STOCK, CONTACT_SUPPLIER.
- `listing_status`: enum DRAFT, ACTIVE, SUSPENDED, ARCHIVED.
- `price_updated_at`: server-managed timestamptz.
- `stock_updated_at`: server-managed timestamptz.
- `created_at`, `updated_at`: server-managed timestamptz.

Indexes to consider: provider profile + listing status; category + listing status; listing status + updated time; price; name search. Add only indexes supported by actual query plans and common filters.

### Required database safeguards

- RLS enabled on the new table.
- No permissive policies.
- Revoke `anon` and `authenticated` table privileges, matching the existing server-Prisma-only architecture.
- Database constraints for positive price and valid required fields where practical.
- Foreign keys and delete behaviour reviewed explicitly; no cascade that could silently erase marketplace listings.
- Do not add a global product catalogue, price history table, images/storage tables, RFQ or order tables in this phase.

The Prisma schema, migration SQL and actual PostgreSQL catalog must agree. A Prisma model annotation alone is not proof that RLS and grants are correct.

## 6. File-level implementation order

1. Re-inspect current `main` and the approved design branch; confirm no intervening changes.
2. Reconcile Phase 2 status documentation with the actual merged commits, migration history and production evidence. Do not edit frozen migration files.
3. Add the Phase 3 decision entry and finalise the exact table/enum/constraint design.
4. Write migration SQL and a rollback/forward-recovery note. Test on a disposable PostgreSQL instance first.
5. Add Prisma model/enums and run Prisma format, validate and generate.
6. Implement validation schemas and provider access helper.
7. Implement public read queries and tests.
8. Implement provider mutations and tests, including audit logging.
9. Add provider and public API routes.
10. Add administrator category and moderation routes.
11. Add minimal mobile-first pages/components for browse, detail, provider listing management and admin moderation, after reviewing the existing app route/component patterns.
12. Run all tests, lint, typecheck, Prisma validation/generation, build, SQL/RLS/grants checks and regression tests.
13. Review complete diff, dependency changes, security and performance. No dependency additions expected.
14. Prepare a handover with actual command output and limitations.
15. Stop for owner review before any merge, production migration or deployment.

## 7. Additional UI files (to be named after route inventory)

Expected UI areas:

- Public marketplace browse and product detail.
- Provider's own product list and create/edit form.
- Administrator product moderation and category management.

Use existing shared layout, navigation, form, error and pagination components where available. Do not create duplicate design systems or add image upload controls in this phase. The interface must remain usable on Android and low-bandwidth connections.

## 8. Acceptance-to-file traceability

| Acceptance area | Main files/tests |
|---|---|
| Provider identity/profile ownership | `lib/auth/provider-access.ts`, provider route tests |
| Listing validation | `lib/validation/products.ts`, validation tests |
| Create/edit/publish/archive | `lib/products/mutations.ts`, provider API tests |
| Public search/filter/pagination | `lib/products/queries.ts`, public API tests |
| Accurate price/stock timestamps | mutation service and unit tests |
| Category management | admin category route, admin tests |
| Moderation and audit | moderation route, `lib/security/audit.ts`, admin tests |
| RLS/default-deny grants | migration SQL, disposable DB test |
| Mobile-first UX | public/provider/admin pages and responsive UI review |
| Regression | full existing Vitest suite, lint, typecheck and build |

## 9. Explicit release gates

- No work on `main` during implementation.
- No production database command until the migration has been reviewed and the owner separately approves the exact operation.
- No production environment variable changes.
- No paid services, paid APIs or new dependencies without separate approval.
- No destructive migration, data rewrite, legacy supplier-profile mutation or category reseeding.
- No merge to `main` until code review and CI evidence are presented and the owner approves.
- No Render deployment until merge and deployment are separately approved.

## 10. Known documentation correction required

The current `docs/ROADMAP.md` and `docs/REVIEW.md` contradict the current repository state: they describe Phase 2 as not started / on a review branch, while current `main` contains provider profile models and the provider verifier-integrity migration. The next implementation session must establish the exact Phase 2 merged files, migration IDs, CI evidence and live migration evidence before updating these status claims. Do not infer live production migration status from the existence of a migration file in GitHub.

## 11. Current completion state

- Phase 3 specification: approved by owner.
- File-by-file plan: prepared.
- Application implementation: not started.
- Phase 3 migration: not written or applied.
- Production database and Render: unchanged by this plan.
- Merge/deploy approval: not requested or assumed.
