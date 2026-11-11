# Phase 4.5 — Defect register

**Status:** Open for acceptance-test findings  
**Prepared:** 2026-11-11  
**Source plan:** [Phase 4.5 acceptance plan](PHASE_4_5_ACCEPTANCE_PLAN.md)

## Current evidence position

A01 passed based on owner-reported live testing. A02 catalogue browsing works for a signed-out visitor, but DEF-001 is confirmed by the owner's report and supported by Render application logs. The root connection problem is isolated to the Render-to-Supabase Prisma connection; the exact misconfiguration in Render's secret connection string has not yet been identified.

The Supabase project png-materials-marketplace (upsnqffflxpsvqexascf) reports ACTIVE_HEALTHY, and a read-only SELECT now() through the Supabase connection succeeded on 2026-11-11. Render logs at 2026-11-11 08:41 UTC show Prisma initialization failures for both productCategory.findMany() and productListing.findMany(), with: FATAL: (ENOTFOUND) tenant/user postgres.upsnqffflxpsvqexascf not found. This strongly indicates a mismatch or routing problem in the database connection configured for the Render service, not missing catalogue records or tables. The Render service metadata does not expose secret environment-variable values, and no credentials or settings have been changed.

## Defect intake template

Add one row per distinct reproducible issue. Keep secrets, passwords, personal contact details and production customer data out of this document.

| ID | Acceptance test | Severity | Status | Reproduction steps | Expected result | Actual result | Evidence / safe reference | Owner / next action | Retest |
|---|---|---|---|---|---|---|---|---|---|
| DEF-001 | A02 — guest catalogue | Medium (provisional) | Open — Render/Supabase connection diagnosis confirmed; exact Render connection-string configuration pending | Open the public catalogue while signed out | Listings and categories load; API failures return structured JSON rather than an empty/non-JSON response | User reports: Failed to execute 'json' on 'Response': Unexpected end of JSON input. Render logs show Prisma connection failures for categories and listings: FATAL: (ENOTFOUND) tenant/user postgres.upsnqffflxpsvqexascf not found | Owner-reported on 2026-11-11; Render application logs at 2026-11-11 08:41 UTC; Supabase project status ACTIVE_HEALTHY; read-only database query succeeded at 08:47 UTC | Verify Render's configured database connection host, port, username and connection mode against the active Supabase project's connection details. Do not expose or paste passwords/tokens. Correct only after confirming the exact mismatch and obtaining owner approval for changing production service secrets/settings. | Pending |

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

**One open defect:** DEF-001 affects initial guest catalogue data loading because Render's Prisma connection to Supabase fails. Continue with the remaining acceptance tests only where the affected journey is not blocked; retest A02 after the connection configuration is corrected through an approved change.
