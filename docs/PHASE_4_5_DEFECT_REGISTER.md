# Phase 4.5 — Defect register

**Status:** Open for acceptance-test findings  
**Prepared:** 2026-11-11  
**Source plan:** [Phase 4.5 acceptance plan](PHASE_4_5_ACCEPTANCE_PLAN.md)

## Current evidence position

One live manual acceptance result has been supplied: A01 passed. No product defects are currently confirmed by this register. This is not a claim that the product has no defects.

The automated checks on PR #18 passed. The live Render service was inspected and reported the latest deployment as live on the PR #17 merge commit. These facts do not substitute for manual browser/device acceptance testing.

## Defect intake template

Add one row per distinct reproducible issue. Keep secrets, passwords, personal contact details and production customer data out of this document.

| ID | Acceptance test | Severity | Status | Reproduction steps | Expected result | Actual result | Evidence / safe reference | Owner / next action | Retest |
|---|---|---|---|---|---|---|---|---|---|
| DEF-001 | A02 — guest catalogue | Medium (provisional) | Open — root cause under investigation | Open the public catalogue while signed out; exact trigger not yet isolated | Listings load without a JSON parsing error; API failures should return a valid structured JSON error | User reports: `Failed to execute 'json' on 'Response': Unexpected end of JSON input` appears in the Marketplace listings section, although catalogue browsing works | Owner-reported on 2026-11-11; device/browser and exact trigger not yet recorded | Inspect `/api/products` and `/api/categories` response handling; identify empty/non-JSON response source before changing code | Pending |

## Severity definitions

- **Critical:** account takeover, cross-provider access to private data, sensitive data exposure, irreversible data loss, or equivalent security/safety failure. Stop release.
- **High:** core registration/login, public browsing, provider listing ownership or publication journey is broken or bypassable. Fix and retest before launch consideration.
- **Medium:** significant feature degradation with a reasonable workaround; schedule remediation and record any accepted deferral.
- **Low:** cosmetic, minor usability or non-blocking issue; prioritise without blocking unless cumulative impact is material.

## Required report for each finding

1. Defect ID and affected acceptance-test ID.
2. Date/time tested and device/browser (avoid personal identifiers).
3. Signed-in role: public visitor, individual provider, business provider or administrator.
4. Short reproduction steps.
5. Expected versus actual behaviour.
6. Severity and impact.
7. Evidence reference, with sensitive data redacted.
8. Whether it is reproducible.
9. Fix PR/commit reference when addressed.
10. Retest result and date.

## Release handling

- Critical and high defects must be fixed and retested before a launch-readiness recommendation.
- Medium/low defects must be documented with a disposition.
- Do not include credentials, auth tokens, private user data or production secrets in issues, PRs, screenshots or this register.
- Do not make production database, Render, Supabase, secret, paid-service or public-launch changes without the required owner approval.
- Buyer/customer account registration remains out of scope. Public visitors continue to browse without an account.

## Current register outcome

**No confirmed defects entered.** A01 passed; continue recording findings from the remaining acceptance tests. Each test should be marked Pass, Fail or Not tested in the acceptance plan; every Fail should be assessed here before it is treated as a confirmed defect.
