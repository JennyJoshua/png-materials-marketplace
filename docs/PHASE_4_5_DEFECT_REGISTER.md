# Phase 4.5 — Defect register

**Status:** Open for acceptance-test findings  
**Prepared:** 2026-11-11  
**Source plan:** [Phase 4.5 acceptance plan](PHASE_4_5_ACCEPTANCE_PLAN.md)

## Current evidence position

No live manual acceptance results have yet been supplied or recorded against the Phase 4.5 checklist. Therefore, **no product defects are currently confirmed by this register**. This is not a claim that the product has no defects.

The automated checks on PR #18 passed. The live Render service was inspected and reported the latest deployment as live on the PR #17 merge commit. These facts do not substitute for manual browser/device acceptance testing.

## Defect intake template

Add one row per distinct reproducible issue. Keep secrets, passwords, personal contact details and production customer data out of this document.

| ID | Acceptance test | Severity | Status | Reproduction steps | Expected result | Actual result | Evidence / safe reference | Owner / next action | Retest |
|---|---|---|---|---|---|---|---|---|---|
| — | No confirmed defects recorded yet | — | Awaiting testing | — | — | — | — | Record findings from Phase 4.5 checklist | — |

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

**No confirmed defects entered.** Await completed acceptance results. Each test should be marked Pass, Fail or Not tested in the acceptance plan; every Fail should be assessed here before it is treated as a confirmed defect.
