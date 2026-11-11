# Phase 4.5 — Defect register

**Status:** Open for acceptance-test findings  
**Prepared:** 2026-11-11  
**Source plan:** [Phase 4.5 acceptance plan](PHASE_4_5_ACCEPTANCE_PLAN.md)

## Current evidence position

A01 passed based on owner-reported live testing. DEF-001 was caused by the Supabase project being paused. The owner restored/activated the Supabase project and refreshed the Render-hosted marketplace. The owner reports that the JSON parsing error disappeared and the Marketplace listings section now displays its normal empty-state message: "No matching products yet — Try another search or clear some filters."

This confirms the reported catalogue loading symptom is resolved after the Supabase project was reactivated. No application-code change, Render environment-variable change, database schema change or credential change was required. Earlier Render logs at 2026-11-11 08:41 UTC showed Prisma connection failures while the Supabase project was paused. A subsequent read-only query against Supabase succeeded after the project was active.

## Defect intake template

Add one row per distinct reproducible issue. Keep secrets, passwords, personal contact details and production customer data out of this document.

| ID | Acceptance test | Severity | Status | Reproduction steps | Expected result | Actual result | Evidence / safe reference | Owner / next action | Retest |
|---|---|---|---|---|---|---|---|---|---|
| DEF-001 | A02 — guest catalogue | Medium (provisional) | **Closed — owner retest passed** | Open the public catalogue while signed out; initial report occurred while the linked Supabase project was paused | Listings/categories load, or a clear empty-state message appears when there are no matching public listings; no JSON parsing error | Initially showed: Failed to execute 'json' on 'Response': Unexpected end of JSON input. Owner reactivated the paused Supabase project and refreshed the Render page; error disappeared and the normal empty state appeared: "No matching products yet — Try another search or clear some filters." | Owner-confirmed retest on 2026-11-11; earlier Render logs at 08:41 UTC recorded Prisma connection failures during the paused-project period | No code change required. Keep the Supabase project active and monitor availability. Reopen only if the error recurs. | **Pass — owner-confirmed after Supabase reactivation, 2026-11-11** |

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

**No currently open defects are recorded from this acceptance pass.** DEF-001 is closed following the owner's successful retest after reactivating the paused Supabase project. Continue with the remaining acceptance tests.
