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
| 1 | Foundation | Implemented in the repository; recorded as PARTIALLY COMPLETE (see below) |
| 2 | General marketplace data model | Planned. Not started |
| 3 | Product marketplace | Planned. Not started |
| 4 | Services marketplace | Planned. Not started |
| 5 | Transactions and trust | Planned. Not started |
| 6 | Business development | Planned. Not started |

## Dependencies

```
Phase 1 (validated)
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

Status: Implemented in the repository; PARTIALLY COMPLETE per docs/REVIEW.md.

What exists: Supabase Auth registration, login and logout for customers and suppliers; email-confirmation handling; three role dashboards; server-side role checks; five tables (users, customer_profiles, supplier_profiles, product_categories, audit_logs) with Row Level Security enabled and no policies; a category seed script; an audit-log foundation; in-memory rate limiting; security headers; automated tests. The implementation is preserved as it is.

Outstanding validation and deployment work (from REVIEW.md; update that file as items are confirmed):

1. Supabase project created and Authentication configured (email confirmation, minimum password length, Site URL and redirect URLs).
2. Migration applied to Supabase with `prisma migrate deploy`. Status in the repository: generated, recorded as not applied.
3. Category seed run.
4. Row Level Security verified on the live database (SETUP_SUPABASE.md section 6).
5. A live sign-up, email confirmation and sign-in test against Supabase.
6. The first administrator created through the documented manual step.
7. Render deployment and production redirect URLs.
8. Open items noted in REVIEW.md: dependency audit follow-up, a Content-Security-Policy header, and a password-reset page (a deliberate deferral).

Exit criteria: items 1 to 7 confirmed and recorded in REVIEW.md, with the status updated. Phase 2 should not begin until the live sign-up flow has been proven at least once.

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
| 7 Testing and Deployment | Part of every phase's exit criteria; Render deployment is a Phase 1 outstanding item |

## What this roadmap does not decide

Payment methods, subscription pricing, commission rates, the public brand name, whether businesses get staff accounts, and the final verification levels. These are open questions listed in ARCHITECTURE.md Part C12.
