# Phase 4.5 — Stabilisation and acceptance plan

**Repository:** `JennyJoshua/png-materials-marketplace`  
**Prepared:** 2026-11-11  
**Status:** In progress; A01 passed based on owner-reported live testing.

## Purpose

Confirm that the deployed Phase 4 marketplace works for real visitors and providers before the owner makes a separate public-launch decision. This is a verification and defect-remediation stage, not an expansion of product scope.

## Known baseline

- Phase 4 marketplace experience merged through PR #15: `bd9bc1948f5a14281880e115d2d19c6cae397baa`.
- Provider-only registration and public guest access merged through PR #17: `11969133bd79d757ccae8a36497fc5251630ab04`.
- Render service: https://png-materials-marketplace.onrender.com (live deployment inspected on main at the PR #17 merge commit).
- Automated PR #15 evidence: 259 tests passed; TypeScript check and production build passed; disposable PostgreSQL migration/RLS/grant/constraint validation passed.
- Owner has reported the deployed application is functioning.

## Acceptance record

For each item, record Pass / Fail / Not tested and a short observation. Do not enter Pass until the relevant live journey has actually been exercised.

| ID | Test | Result | Evidence / notes |
|---|---|---|---|
| A01 | Open homepage as a signed-out visitor | **Pass** | Owner-reported on 2026-11-11: homepage loads very beautifully when opened signed out. Device/browser details not recorded. |
| A02 | Browse catalogue without an account | Not tested | |
| A03 | Search, filter, sort and paginate catalogue | Not tested | |
| A04 | Open product detail and confirm public information is appropriate | Not tested | |
| A05 | Register an Individual Provider and complete email confirmation | Not tested | |
| A06 | Register a Business Provider and complete email confirmation | Not tested | |
| A07 | Provider signs in and reaches the provider workspace | Not tested | |
| A08 | Provider creates, edits, publishes, unpublishes and archives own listing | Not tested | |
| A09 | Provider cannot edit or manage another provider's listing | Not tested | |
| A10 | Signed-out visitor cannot access provider/admin protected functions | Not tested | |
| A11 | Administrator access is restricted; no public admin registration | Not tested | |
| A12 | Public pages do not reveal private account email, street address or internal data | Not tested | |
| A13 | Android/mobile layout and touch controls are usable | Not tested | |
| A14 | Slow/intermittent connection, loading, empty and error states are understandable | Not tested | |
| A15 | No critical/high severity defects remain open after retest | Not tested | |

## Severity and release rules

- **Critical:** data exposure, account takeover, cross-provider data access, data loss or equivalent. Stop release; remediate and retest.
- **High:** registration/login failure, provider ownership bypass, listing publication failure or public catalogue failure. Remediate and retest before launch consideration.
- **Medium/Low:** record, prioritise and document accepted workarounds or deferrals.

Production database operations, production settings/secrets, paid services, production deployment and public launch remain explicit owner-approval gates.

## Scope exclusions

- No buyer/customer registration or buyer dashboard.
- No orders, checkout, payments, quotations, bookings or delivery workflows.
- No schema/migration changes unless separately designed, reviewed and explicitly approved.
- No broad dependency upgrades as part of this pass; handle security advisories as a separately reviewed change.

## Exit criteria

1. All applicable acceptance cases have a recorded result.
2. Critical/high defects are fixed and retested.
3. Remaining defects and limitations are documented with severity and disposition.
4. A release-readiness report is presented to the owner.
5. Owner explicitly decides whether to authorise public launch. A live Render deployment alone is not that decision.

## Next product phase — Phase 5

After Phase 4.5, prepare a separate design for guest-first enquiries and quotations. Visitors submit product/material enquiries or service requests without buyer accounts. Providers receive and respond through their provider workspace. Individual and business providers are supported. Orders, payments, booking complexity, commissions and subscriptions remain deferred.
