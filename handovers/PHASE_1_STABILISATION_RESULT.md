# Handover back: Phase 1 stabilisation result

Date: 2026-10-25
Answers: `handovers/PHASE_1_COMPLETION_AND_STABILISATION.md` (2026-10-24)

**Phase 1 status: PARTIALLY COMPLETE. Phase 2 not started. No production change was made.**

## What was done
- Traced register, login, confirmation callback, profile recovery, audit logging and API guards. Fixed five database-failure weaknesses with 38 new tests (the behaviour tests fail on the old code). Added `check-env.mjs` for safe database-URL checks.
- Wrote `docs/PHASE_1_VERIFICATION_REPORT.md` (evidence tags, security findings by severity, migration reconciliation note, owner decisions) and `docs/sql/phase1-readonly-checks.sql` (10 read-only SELECTs, validated on a scratch PostgreSQL 16).
- Patch-level dependency update (`next` 15.5.28, `zod` 4.6.7, lockfile): fixes the critical `next` advisory and several high ones in production dependencies.
- Corrected README, REVIEW, ROADMAP, SETUP_SUPABASE, SETUP_RENDER, TROUBLESHOOTING, DATABASE, DECISIONS, CHANGELOG.

## Where the work is
A ZIP of changed files (not merged, not pushed). Uploading it to `_inbox/` commits to `main` and Render then deploys it, so review first, or apply it to the branch `handover/phase-1-stabilisation-2026-10-24` and open a pull request.

## Test evidence (my sandbox, 2026-10-25)
lint, typecheck, `prisma validate`, `prisma generate` and build all exit 0. `npm test`: 162 tests, 161 pass, 1 fails: the repository hygiene test, because `public/icon.svg` duplicates `app/icon.svg` (delete `public/icon.svg`). Prisma commands used stub engines because the engine download host is blocked in my sandbox.

## Could not verify (no access)
Render settings, logs and deployment; Supabase settings and the live database; live registration, confirmation, login; the `X-Forwarded-For` behaviour on Render; exploitability of the `next` advisories.

## Unresolved
1. Prisma history conflict: the owner said not recorded (2026-10-21); the 2026-10-24 handover reports a completed record. Needs the owner to run the read-only SQL and return Result 1.
2. Cause of the 2026-10-23 "invalid port number in database URL" error is unknown; the current Render value needs a local `node check-env.mjs` check.
3. `migration.sql` header is stale and intentionally not edited (checksum risk).

## Decisions needed from the owner
See `docs/PHASE_1_VERIFICATION_REPORT.md` section 11: dependency update approval; read-only SQL results; `_prisma_migrations` hardening; `X-Forwarded-For` rule; cookie `httpOnly` and CSP; leaked-password protection and plan; recovery message; deleting stray files; live acceptance test; Render URL check.

## Recommended next step
The owner runs `docs/sql/phase1-readonly-checks.sql` and returns the Result 1 row; then decide the migration-history action from the decision table. Do not start Phase 2 until Phase 1 is accepted.
