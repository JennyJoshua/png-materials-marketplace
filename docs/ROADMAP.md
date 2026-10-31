# Roadmap

PNG Marketplace (repository: png-materials-marketplace)

Last updated: 2026-10-21 (scope expansion; documentation only)

This roadmap plans a general-purpose marketplace for goods and services in Papua New Guinea. Building materials remain an important first category. Nothing beyond Phase 1 exists yet.

Status key: Implemented, Planned, Proposed (a recommendation awaiting approval).

## Rules for every phase

- Phases are built one after another. They are not built simultaneously.
- A phase needs its own specification before work starts.
- Database changes are designed and reviewed before they are implemented. Each phase brings its own reviewed migrations, with access control and Row Level Security considered from the start.
- Tests are written with each phase. A phase is finished only when its features work, its tests pass, and its status in docs/REVIEW.md is updated honestly.
- Payments, delivery marketplace and AI features stay deferred unless a later decision changes that.

## Status summary

| Phase | Name | Status |
|---|---|---|
| 1 | Foundation | Implemented in the repository; PARTIALLY COMPLETE (verified and outstanding items below) |
| 2 | General marketplace data model | Planned. Not started |
| 3 | Product marketplace | Planned. Not started |
| 4 | Services marketplace | Planned. Not started |
| 5 | Transactions and trust | Planned. Not started |
| 6 | Business development | Planned. Not started |

## Dependencies

```
Phase 1 (validation in progress)
   |
   v
Phase 2  data model and account approach
   |
   v
Phase 3  products ------+
   |                    |
   v                    v
Phase 4  services       |
   |                    |
   +----------+---------+
              v
Phase 5  transactions and trust
              |
              v
Phase 6  business development
```

- Phase 2 needs a validated Phase 1.
- Phase 3 needs Phase 2 (provider profiles, categories, locations, access rules).
- Phase 4 needs Phase 2. It reuses patterns from Phase 3 (listings, search), so it follows Phase 3.
- Phase 5 needs listings from Phases 3 and 4, because quotations, orders and bookings refer to them.
- Phase 6 needs Phase 5 and real usage, because pricing and revenue options depend on evidence.

## Phase 1 - Foundation

Status: Implemented in the repository; **PARTIALLY COMPLETE** per docs/REVIEW.md. Phase 1 is not fully complete.

Implemented: Supabase Auth registration, login and logout for customers and suppliers; email-confirmation handling; three role dashboards; server-side role checks; five tables (users, customer_profiles, supplier_profiles, product_categories, audit_logs) with Row Level Security enabled and no policies; a category seed script; an audit-log foundation; in-memory rate limiting; security headers; automated tests. The implementation is preserved as it is.

Verified (live Supabase database, reported by the project owner on 2026-10-21; details in docs/REVIEW.md):

1. The Phase 1 migration SQL was applied manually.
2. The category seed ran successfully: exactly 15 product categories exist, all ACTIVE.
3. RLS was enabled and checked on all five tables; no policies exist; table privileges were revoked from `anon` and `authenticated` (default-deny). This alone does not prove the complete application is secure.
4. Supabase Auth: email and email confirmation enabled, anonymous sign-ins disabled. The application enforces a minimum password length of 10 characters.

Outstanding:

1. **Prisma migration-history status: conflicting evidence.** The 2026-10-21 owner report said the migration is not recorded in `_prisma_migrations`; the 2026-10-24 handover reports one completed record. To reconcile: run the read-only `docs/sql/phase1-readonly-checks.sql` and use the decision table in docs/PHASE_1_VERIFICATION_REPORT.md section 5.4. If a matching record exists, no baseline is needed. Only if there is no record, with owner approval: `npx prisma migrate resolve --applied 20261005000000_phase1_foundation` (records the migration; does not run the SQL).
2. **Safe verification of Prisma connectivity and migration status** against the live database (read-only commands first; docs/SETUP_SUPABASE.md section 5).
3. **Live sign-up, email-confirmation and sign-in testing.** Still requires confirmation.
4. **Confirmation of Render deployment and production configuration.** The deployment status is unconfirmed: it is not recorded as completed, nor as definitively outstanding.
5. **`_prisma_migrations` exposure** (reported: RLS off, `anon`/`authenticated` SELECT): owner approval needed for the proposed fix (verification report section 6).
6. **Database URL on Render:** a 2026-10-23 log showed "invalid port number in database URL"; current value to be checked with `node check-env.mjs`.
7. **Owner decisions** on the dependency patch update and the other security findings (verification report sections 6 and 11).

Status not recorded either way: creation of the first administrator; Supabase Site URL and redirect URLs. Open items from the earlier review: dependency audit follow-up, a Content-Security-Policy header, and a password-reset page (a deliberate deferral).

**Warning:** do not run `prisma migrate deploy`, `prisma migrate dev`, `prisma migrate reset` or `prisma db push` against the existing live database until the history is reconciled and the owner has approved the exact operation.

Exit criteria: Outstanding items 1 to 6 resolved or explicitly accepted by the owner, and recorded in docs/REVIEW.md with the Phase 1 status updated. Phase 2 should not begin until the migration history is reconciled and the live sign-up flow has been proven at least once.

## Phase 2 - General marketplace data model

Status: Planned. Not started. Design first.

Goals:

- Finalise the account and provider-profile approach (ARCHITECTURE.md Part C2): how buyer, provider and administrator relate, and what happens to the SUPPLIER role value.
- Define business and individual provider profiles, and provider types (product seller, service provider, both).
- Define product and service categories, and the location approach (province, district, town or area).
- Define basic provider verification: the levels, what each label means, and who can grant it.
- Design the database changes before implementing them.
- Review access control and Row Level Security requirements for every future table.

Proposed approach: Phase 2 has two steps. Step 1 is design and review only (documents and decisions). Step 2, the implementation (migrations, code, tests), starts only after the design is explicitly approved.

Depends on: Phase 1 validated.

Exit criteria: approved design; approved migration; RLS verified on the live database after migration; provider profile creation and admin verification working and tested; existing Phase 1 behaviour still passing its tests.

## Phase 3 - Product marketplace

Status: Planned. Not started.

- Product listings.
- Provider prices and stock status, shown with the last-updated date.
- Product search and categories, including categories beyond building materials.
- Basic price comparison of provider-provided prices.

Depends on: Phase 2.

Exit criteria: a provider can list a product and update its price and stock; a buyer can search and compare; results never present estimates as provider prices.

## Phase 4 - Services marketplace

Status: Planned. Not started.

- Service listings and categories.
- Provider service areas and availability.
- Service enquiries, quotation requests and bookings.

Depends on: Phase 2; follows Phase 3.

Exit criteria: an individual or business can publish a service with an indicative rate and service area; a buyer can find it by category and location and send a request.

## Phase 5 - Transactions and trust

Status: Planned. Not started.

- Quotations.
- Orders and booking status, with agreed prices preserved.
- Notifications and communication.
- Reviews, complaints and dispute handling, with administrator moderation.

Depends on: Phases 3 and 4.

Exit criteria: the complete product workflow and the complete service workflow in PROJECT_REQUIREMENTS.md section 14 run end to end, and the administrator workflow works.

## Phase 6 - Business development

Status: Planned. Not started. Everything here is an option to evaluate, not a commitment.

- Optional provider subscriptions.
- Featured listings.
- Lead-generation fees or commissions, if viable.
- Payment integrations and other revenue options, after evaluation for Papua New Guinea.

Depends on: Phase 5 and evidence of real use.

## From the earlier roadmap

The earlier seven-phase plan was written for building materials only. This is how it maps:

| Earlier phase | Now |
|---|---|
| 1 Foundation | Phase 1 (unchanged) |
| 2 Supplier Portal | Provider profiles in Phase 2; product management in Phase 3 |
| 3 Customer Marketplace | Phase 3 (products) and Phase 4 (services) |
| 4 RFQ Engine, 5 Quotation Engine, 6 Orders | Phase 5 |
| 7 Testing and Deployment | Part of every phase's exit criteria; Render deployment status is unconfirmed (Phase 1) |

## What this roadmap does not decide

Payment methods, subscription pricing, commission rates, the public brand name, whether businesses get staff accounts, and the final verification levels. These are open questions listed in ARCHITECTURE.md Part C12.

## Phase 2 status update (2026-10-31)

Provider foundation is on review branch `feature/phase-2-provider-foundation`, based on current main. It is not merged or deployed. Owner must review ZIP and migration before any application. Legacy supplier data is retained untouched; no speculative backfill. Product listings/search/comparison and service listings/search/bookings/quotes remain later phases.
