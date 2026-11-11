# Roadmap

PNG Marketplace (repository: png-materials-marketplace)

Last updated: 2026-11-11 (Phase 4 and provider-only access merged; Phase 4.5 readiness plan)

This roadmap covers the general-purpose marketplace for goods and services in Papua New Guinea. Building materials remain the first product category. The current phase sequence below supersedes earlier planning labels and status notes retained later in this file.

Status key: Implemented, Planned, Proposed (a recommendation awaiting approval).

## Rules for every phase

- Phases are built one after another. They are not built simultaneously.
- A phase needs its own specification before work starts.
- Database changes are designed and reviewed before they are implemented. Each phase brings its own reviewed migrations, with access control and Row Level Security considered from the start.
- Tests are written with each phase. A phase is finished only when its features work, its tests pass, and its status in docs/REVIEW.md is updated honestly.
- Payments, delivery marketplace and AI features stay deferred unless a later decision changes that.

## Current agreed phase sequence (11 November 2026)

| Phase | Scope | Status |
|---|---|---|
| 1 | Foundation | Implemented |
| 2 | Provider foundation | Implemented |
| 3 | Product marketplace backend | Implemented and deployed; production migration verified by owner |
| 4 | Marketplace experience | Implemented and deployed (PR #15; PR #17 completes provider-only public access) |
| 4.5 | Stabilisation and launch readiness | Next; acceptance testing and sign-off outstanding |
| 5 | Customer enquiries and supplier quotations | Planned |
| 6 | Orders and transaction management | Planned |
| 7 | Trust, verification and reputation | Planned |
| 8 | Payments and business tools | Deferred pending PNG suitability assessment and explicit approval |
| 9 | Expansion and intelligent services | Future |

Phase 4 implementation is merged and deployed. It includes public product browsing, search/filtering, product details, provider listing management, provider-only registration and guest public access. Phase 4.5 is a release-readiness stage, not a new product feature phase. It covers manual acceptance testing, defects, mobile/low-bandwidth checks, access-control checks and an explicit launch-readiness decision. Enquiries, quotations, orders and payments are not part of Phase 4 or 4.5.

## Historical status summary (superseded)

| Phase | Name | Status |
|---|---|---|
| 1 | Foundation | Implemented in the repository; PARTIALLY COMPLETE (verified and outstanding items below) |
| 2 | General marketplace data model | Planned. Not started |
| 3 | Product marketplace | Planned. Not started |
| 4 | Services marketplace | Planned. Not started |
| 5 | Transactions and trust | Planned. Not started |
| 6 | Business development | Planned. Not started |

## Historical phase design notes (superseded by the current sequence above)

The original phase descriptions below are retained for decision history. Their old status statements and phase numbering are not the current implementation plan.

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

Implemented foundation: Supabase Auth login/logout and provider-only public registration (individual or business); email-confirmation handling; provider workspace and administrator dashboard; server-side role checks; provider profiles; legacy customer/supplier records and Phase 1 tables retained. The buyer dashboard is retired; public browsing does not require sign-in. Automated tests cover registration validation, profile creation/recovery and protected provider access.

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


## Provider-only account implementation (2026-11-03)\n\nImplementation branch: `feature/provider-only-registration-public-marketplace`, based on the approved account-access decision branch. It updates public registration, provider profile creation/recovery, protected provider pages/APIs, public navigation and legacy customer dashboard handling. The database role enum and existing customer data are preserved; no SQL migration is required by this change. The branch must pass CI and owner review before merge. No production migration or deployment is authorised by this work.\n

## Phase 4.5 — Stabilisation and launch readiness

**Status: Next. Not yet started or signed off.** The application is deployed on Render, and the owner has reported that it functions. That is useful evidence, but it is not a substitute for a recorded acceptance test. The live service being marked `live` means deployment succeeded; it does not mean the product is publicly launched or fully verified.

### Baseline deployment evidence

- Phase 4 marketplace experience merged in PR #15: `bd9bc1948f5a14281880e115d2d19c6cae397baa`.
- Provider-only registration and public guest access merged in PR #17: `11969133bd79d757ccae8a36497fc5251630ab04`.
- Render service: `https://png-materials-marketplace.onrender.com`, tracking `main`; latest inspected live deployment corresponds to PR #17 merge commit.
- Automated validation recorded in PR #15: 259 tests passed, TypeScript type-check passed, production build passed, and disposable-PostgreSQL migration/RLS/grant/constraint validation passed.
- Still outstanding: manual browser/device acceptance, live registration and provider workflow confirmation, and a documented release decision.

### Acceptance checklist

1. Public visitor opens the homepage and can browse without registering or signing in.
2. Public visitor can search/filter the catalogue and open product details; empty results and pagination behave correctly.
3. Individual-provider registration works, including email confirmation and return to the public site.
4. Business-provider registration works, including email confirmation and return to the public site.
5. Provider can sign in, view their workspace, create/edit a listing, and publish/unpublish/archive only their own listings.
6. A provider cannot modify another provider's listings; public visitors cannot access provider or administrator functions.
7. Administrator access remains restricted; no public administrator registration is available.
8. Public pages do not expose provider street addresses, private account email, secrets or internal-only data.
9. Core journeys remain usable on an Android-sized screen and on a slow/intermittent connection; loading, empty and error states are understandable.
10. No critical or high-severity defect remains open. Record any lower-severity known issues and their accepted disposition.

Record each result as **Pass**, **Fail**, or **Not tested**, with a short note. Do not record an item as passed based only on automated tests if it requires live interaction.

### Defect and release gates

- Critical security/data-loss issue: stop release and remediate before any launch decision.
- High-severity failure in registration, provider ownership, listing publication or public browsing: fix and retest before launch.
- Production database changes, Render configuration changes, secret changes, paid services and production deployment remain explicit owner-approval gates.
- Do not add buyer/customer registration. Browsing remains guest-first; registration is for Individual Provider or Business Provider only.
- Do not introduce payments, ordering, quotations or bookings as part of stabilisation.

### Exit criteria

Phase 4.5 is complete only when the checklist has recorded results, critical/high defects are closed and retested, remaining issues are documented, and the owner explicitly accepts the launch-readiness report. Public launch is a separate owner decision.

## Phase 5 — Enquiries and quotations (recommended scope)

**Status: Planned; specification required before implementation.** Support guest-first product enquiries and service requests without creating buyer accounts. Include contact/request capture, provider inbox, quotation preparation and response/history. A request may cover multiple products/materials or a service job. Both individual professionals and businesses must be supported. Defer orders, online payments, booking complexity, commissions and subscriptions. Design the data model, abuse controls, privacy/retention, provider ownership, notifications and acceptance criteria before any migration or code work.
