# Dependency Security Review — Phase 3 Marketplace

**Date:** 1 November 2026  
**Repository:** `JennyJoshua/png-materials-marketplace`  
**Scope:** Dependency tree on `feature/phase-3-product-marketplace`, with remediation isolated on `security/dependency-advisory-remediation`.

## Baseline audit

A fresh `npm ci` followed by `npm audit --json` reproduced the reported **23 advisories** across 502 installed dependency entries:

| Severity | Baseline |
|---|---:|
| Critical | 2 |
| High | 5 |
| Moderate | 16 |
| **Total** | **23** |

The two critical findings were in the Vitest test runner dependency chain (`vitest`, `@vitest/mocker`, and `tinypool`). High findings included PostCSS source-map disclosure issues and the Prisma configuration dependency `deepmerge-ts`.

## Changes made

- Updated Vitest from 3.2.7 to **4.1.12**. This moves the worker/mocker dependency chain past the affected versions and clears both critical findings.
- Kept the Vite major line on **7.3.7**, the patched 7.x release, rather than allowing the Vitest update to pull Vite 8.
- Added a PostCSS override to **8.5.32**, resolving the PostCSS advisories without upgrading Next.js from 15.
- Added a `deepmerge-ts` override to **8.0.2** for Prisma 6.19.3. Prisma client generation and schema validation were exercised successfully with this resolved version.
- Raised the declared Node minimum to **20.19.0**, matching Vite 7's engine requirement.
- Added explicit mock-call parameter types in `tests/diagnostics.test.ts` to satisfy Vitest 4's updated types.

No application features, database schema, migrations, Supabase settings, Render configuration, or production data were changed.

## Results after remediation

| Audit | Critical | High | Moderate | Total |
|---|---:|---:|---:|---:|
| Full dependency tree | 0 | 0 | 14 | 14 |
| Production dependencies (`npm audit --omit=dev`) | 0 | 0 | 0 | 0 |

The 14 remaining moderate findings are confined to the development lint/tooling dependency chain around ESLint 9, `eslint-config-next`, and `minimatch`. They are not present in the production-only dependency audit.

A trial override of `minimatch` 3.x to 10.x was rejected: it broke ESLint's import of the default export and caused lint to fail. The override was removed. Clearing this remaining development-only group safely requires a coordinated toolchain major upgrade; the automated audit's proposed version jumps are not appropriate to apply blindly to this Next.js 15 branch. Next.js 16 / ESLint 10 and Prisma 7 upgrades are deliberately deferred.

## Validation performed in the isolated sandbox

- `npm test`: **249 passed**, 23 test files
- `npm run lint`: passed
- `npm run typecheck`: passed
- `npm run db:generate`: passed (Prisma Client 6.19.3)
- `npm run db:validate`: passed with placeholder local connection strings; no live database was contacted
- `npm run build`: passed on Next.js 15.5.28
- `npm audit --omit=dev`: **0 production advisories**
- Full `npm audit`: **0 critical, 0 high, 14 moderate**

The disposable PostgreSQL migration workflow should also run on the pull request before this branch is considered ready. No production database, Render service, production migration, merge to `main`, or deployment was touched.

## Release recommendation

Review this remediation as a separate change against the Phase 3 feature branch. Keep the remaining moderate ESLint toolchain advisories visible as a tracked follow-up; do not use `npm audit fix --force` or force a framework major upgrade as part of this patch.
