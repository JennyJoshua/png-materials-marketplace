# Roadmap

PNG Marketplace — general-purpose marketplace for goods and services in Papua New Guinea.

Last updated: 2026-11-01

Status key: **Implemented** = present in main; **Production verified** = owner-confirmed live evidence; **In review** = implemented and validated on a feature branch, awaiting owner review/merge; **In progress** = implementation underway on a feature branch; **Planned** = not started; **Partially complete** = some exit criteria remain unverified.

## Rules for every phase

- Build phases sequentially; maintain a separate specification and feature branch for each phase.
- Design and review database changes, authorization and Row Level Security before implementation.
- Add tests with each phase. Record actual command output and distinguish local/sandbox checks from live production checks.
- Do not merge to `main`, run production migrations, change production configuration or deploy without separate owner approval.
- Preserve existing customer, supplier and provider data. No destructive migration or speculative backfill.
- Payments, delivery marketplace and AI features remain deferred unless separately approved.

## Status summary

| Phase | Name | Status |
|---|---|---|
| 1 | Foundation | Implemented; production login and application health checks owner-confirmed; other historical verification items remain open/unconfirmed |
| 2 | General marketplace data model / provider foundation | Implemented on `main`; provider foundation migration applied and verified in production per owner-confirmed project handover |
| 3 | Product marketplace | Implemented and validated on feature branch; draft PR #13 awaiting review and merge approval |
| 4 | Services marketplace | Planned |
| 5 | Transactions and trust | Planned |
| 6 | Business development | Planned |

## Dependencies

```
Phase 1 Foundation
   |
   v
Phase 2 Provider profiles, categories, locations and access rules
   |
   v
Phase 3 Product listings, prices, stock and comparison
   |
   v
Phase 4 Service listings, areas and availability
   |
   v
Phase 5 Quotations, orders, bookings and trust
   |
   v
Phase 6 Optional business/revenue development
```

## Phase 1 — Foundation

**Status: Implemented; partially complete as a verification record.**

The repository contains Supabase Auth, application users and roles, customer/supplier profiles, dashboards, server-side access checks, security controls, audit logging and automated tests. The owner has confirmed that the deployed application login works and that post-fix health checks were all good on 2026-11-01.

The historical Phase 1 verification items in this document's review record remain separate: migration-history reconciliation, live sign-up/email-confirmation evidence, selected Supabase settings/security findings and other deferred controls must not be marked complete without fresh evidence. The earlier Render database URL incident was corrected by adding the missing `/postgres` database path to the Supabase pooler URL; the owner confirmed login and health checks after deployment.

## Phase 2 — General marketplace data model and provider foundation

**Status: Implemented on `main`; production migration reported applied and verified.**

The current main branch contains `ProviderProfile`, `ServiceCategory`, provider enums and the provider-verifier integrity migration. PRs #11 and #12 were merged; merge commit `8f4f7a8032e6d6384c0a5e5ebe67346aa7901c21` includes the verifier-integrity change. The owner-confirmed project handover records the provider migration as applied and verified in production, with the verifier foreign key using RESTRICT and its index present. The production provider table was empty at the last reported check and 12 active service categories were seeded. These are point-in-time checks, not a claim that providers have since been added.

Phase 2 exit criteria are considered met for the provider foundation delivered to date. Legacy supplier records remain separate; no speculative migration/backfill is implied.

## Phase 3 — Product marketplace

**Status: Implemented and validated on a separate feature branch; awaiting owner review/merge approval.**

Specification: `docs/PHASE_3_PRODUCT_MARKETPLACE_SPEC.md`. Implementation plan: `docs/PHASE_3_IMPLEMENTATION_PLAN.md`.

Scope: provider-owned product listings, provider-entered prices and stock, public browse/search/filter, bounded pagination, basic price comparison, administrator category management and listing moderation.

Key guardrails: only ACTIVE providers publish; public results require an ACTIVE listing, ACTIVE provider and ACTIVE category; prices are positive PGK amounts stored as NUMERIC, never estimates; price/stock timestamps change only when their respective values change; provider data is restricted to approved public fields. No checkout, cart, orders, payments, RFQs, commissions, image uploads, variants or price-history subsystem in this phase.

Implementation branch: `feature/phase-3-product-marketplace`
Draft PR: https://github.com/JennyJoshua/png-materials-marketplace/pull/13
Validation: 249 tests passed; TypeScript typecheck and Next.js production build passed; Prisma schema validation, full migration application and RLS/grants checks passed on disposable PostgreSQL 16; ESLint passed.

The implemented backend includes provider listing APIs, public category/search/detail APIs, administrator category and listing moderation APIs, strict validation, audit logging and same-origin mutation checks. No new dependencies were added. CI reported 23 advisories in the existing locked dependency tree (16 moderate, 5 high, 2 critical), requiring a separate dependency review before release.

**Release gates:** PR remains draft and unmerged. No production migration, merge to `main`, or Render deployment without separate owner approval.

## Phase 4 — Services marketplace

**Status: Planned.** Service listings, service areas and availability, followed by service enquiries/requests. It reuses the provider foundation and patterns from Phase 3. Booking/quotation workflows remain in Phase 5 unless a later approved specification changes the boundary.

## Phase 5 — Transactions and trust

**Status: Planned.** Quotations, orders and booking status, agreed-price preservation, notifications, communication, reviews, complaints, disputes and administrator moderation.

## Phase 6 — Business development

**Status: Planned; options only.** Optional subscriptions, featured listings, lead-generation fees/commissions and payment integrations may be evaluated only after real usage and a separate viability review for Papua New Guinea.

## What this roadmap does not decide

Payment methods, subscription pricing, commission rates, public brand name, business staff accounts and any expansion of verification levels remain open decisions. Do not infer approval from their appearance in a roadmap.
