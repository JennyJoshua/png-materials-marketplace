# Phase 1 Verification Report

PNG Marketplace (repository: png-materials-marketplace)

Report date: 2026-10-25
Handover executed: `handovers/PHASE_1_COMPLETION_AND_STABILISATION.md` (dated 2026-10-24, branch `handover/phase-1-stabilisation-2026-10-24`)

**Phase 1 status: PARTIALLY COMPLETE.** Phase 2 has not started and was not touched.

**Production changes made by this work: none.** No Render setting, Supabase setting, production SQL, migration command, secret or live account was touched. I had no access to Render or Supabase.

---

## 1. Summary

- I read the repository and traced registration, login, e-mail confirmation, profile recovery, audit logging and the API guards. I found and fixed five weaknesses in how the application behaves when the **database** fails after Supabase Auth has already succeeded. Each fix has regression tests that fail on the old code and pass on the new code (section 4).
- The Render error "invalid port number in database URL" was **not diagnosed to a cause**: I cannot see Render. I added a checker that finds that class of problem offline without printing the connection string (section 4.2).
- The migration-history discrepancy cannot be settled without a live read. I prepared a read-only SQL file and a decision table (section 5). **I did not make the requested edit to the comment header of `migration.sql`**, because it would change the file's checksum (section 5.6).
- The dependency audit found **1 critical and 7 high** advisories in production dependencies, including `next` 15.5.25. Patch releases inside your existing version ranges fix the critical one; I applied them in the lockfile for your review (section 6).
- Phase 1 cannot be called complete until you confirm the items in section 11 and 12.

## 2. Evidence legend and what I could and could not access

| Tag | Meaning |
|---|---|
| **[REPO]** | Read from source code or committed files |
| **[TEST]** | I ran it in my sandbox and recorded the result |
| **[HANDOVER]** | Reported in the 2026-10-24 handover as a read-only observation by someone else. **I could not verify it** |
| **[OWNER]** | Reported by the project owner earlier (2026-10-21). Not independently verified |
| **[UNVERIFIED]** | Not checked by anyone in the available evidence |

| Resource | Access in this work |
|---|---|
| Repository `main` (commit `37ad8f7`) and PR #1 branch | Read |
| Render (service, logs, variables, deployments) | **None.** Nothing about Render was checked |
| Supabase (database, Auth settings, advisors) | **None.** No credentials; I did not ask for any |
| Live production site | Not tested. No live accounts were created and no production e-mail was triggered |
| Prisma engine downloads (`binaries.prisma.sh`) | Blocked in my sandbox (HTTP 403 / no connection). Prisma commands ran with empty stub engine files. Types and schema validation are real; the real engines were never exercised |
| Local PostgreSQL 16 scratch replica | Used (my sandbox only, unrelated to your Supabase project) |

## 3. Observed facts reported in the handover [HANDOVER] (not verified by me)

- Render service `png-materials-marketplace.onrender.com` deploys from `main`; a live deployment after commit `37ad8f7` was seen.
- A Render log of 2026-10-23, during failed-login audit logging: "The provided database string is invalid. Error parsing connection string: invalid port number in database URL."
- Live tables: `users` 2 rows, `customer_profiles` 2, `supplier_profiles` 0, `product_categories` 15, `audit_logs` 12; RLS enabled on all five; no `anon`/`authenticated` SELECT; no policies.
- `public._prisma_migrations`: one completed migration record for `20261005000000_phase1_foundation`; **RLS disabled and `anon`/`authenticated` had SELECT**.
- Supabase Auth: 2 identities, 1 e-mail confirmed. Users: 1 ACTIVE customer, 1 PENDING customer.
- Audit events: USER_REGISTERED 1, PROFILE_CREATE_FAILED 1 (DB_ERROR), PROFILE_RECOVERED 1, USER_LOGIN_FAILED 7, USER_LOGIN 1, USER_LOGOUT 1.
- Supabase advisors: RLS enabled with no policy on five tables (informational); RLS disabled on `_prisma_migrations` (error); leaked-password protection disabled (warning).

These facts are consistent with how the code is designed to behave (for example a PENDING user until e-mail confirmation, and a failed profile creation later recovered). **Consistent is not proof.** The counts include historical events and do not show current behaviour.

## 4. Diagnosis: database connection, registration, login and profile recovery

### 4.1 How the database is configured [REPO]

`prisma/schema.prisma` uses `url = env("DATABASE_URL")` (runtime queries, the pooled string) and `directUrl = env("DIRECT_URL")` (Prisma CLI and migrations). The runtime application only needs `DATABASE_URL`. `prisma generate` and the Next.js build do not connect to the database.

### 4.2 The "invalid port number" error

- The message comes from Prisma parsing `DATABASE_URL` the first time the server queries the database. [HANDOVER] says it appeared while recording a failed login.
- **The cause is not established.** The log does not say which variable, and I cannot see Render's values. Likely causes, none confirmed: a password containing `/`, `?` or `#` that is not URL-encoded; a stray character or space pasted into the Render field; a non-numeric port.
- The audit rows (section 3) show the database worked at other times, so a bad value on 2026-10-23 may have been transient or since corrected. **I cannot tell whether it is still wrong.**
- What I did: the code already keeps the connection string out of logs and responses (tests in `tests/audit-failure.test.ts` use a message that contains a full URL with a password and confirm neither the password nor the user name is printed). I added `check-env.mjs`, which inspects the *structure* of both database URLs and reports, without printing any part of them, problems such as an unencoded `/ ? #`, a non-numeric port, a missing database name, or a `#` that a `.env` file treats as a comment. 17 automated tests run the real tool on crafted `.env` files.
- To check Render's current value safely: copy the value from the Render dashboard into your **local** `.env` on your own computer, then run `node check-env.mjs`. Do not paste the value anywhere else. If it reports a problem, see the correction procedure in `docs/SETUP_RENDER.md` section 3 (needs your approval; I did not change anything).

### 4.3 Flow tracing: findings and fixes [REPO] [TEST]

| # | Weakness found | Before | After | Regression tests |
|---|---|---|---|---|
| F1 | **Login:** Supabase accepts the password, then a database error occurs. | Response was a generic 500, and the Supabase session cookie stayed set: the user was half signed in (the middleware lets a signed-in identity through; the pages then failed) | The session is ended and the response is 503 `DATABASE_UNAVAILABLE` with a safe message | `tests/db-failure.test.ts` (4 cases incl. last-login update failing, failing sign-out) |
| F2 | **E-mail confirmation callback** had no error handling. | A database error produced a raw error page with a live session | Session ended; user sent to `/login?error=unavailable` with a clear notice | `tests/db-failure.test.ts` (3 cases) |
| F3 | **Protected API routes** (`/api/users/me`, `/api/admin/users`) on a database or configuration failure. | Unhandled exception: bare 500 | 503 JSON (`DATABASE_UNAVAILABLE` or `SERVER_NOT_CONFIGURED`). Programming errors still surface; an unauthenticated caller still gets 401 | `tests/db-failure.test.ts` (5 cases) |
| F4 | **Profile recovery** swallowed every failure silently. | No log line at all | The reason is logged (redacted). Behaviour is unchanged: it still returns null | `tests/recovery-logging.test.ts` |
| F5 | **Audit-log failure** during a failed login. | Already harmless (the 401 is unchanged) but not proven | Proven by test: the answer stays a generic 401 and the log has no password or user name | `tests/audit-failure.test.ts` (5 cases) |

Confirmed by trace and left unchanged: wrong-password, unconfirmed-account and duplicate-registration answers are generic and safe; registration works without a session when e-mail confirmation is on; profile creation is idempotent; a failed profile creation at registration is recoverable at next sign-in or in the callback.

Design note, left as is and tested by an existing test: `recoverProfile` returns null on a database failure, so a database flap *during* recovery shows "account setup is incomplete" rather than "unavailable". It is rare (the earlier lookup would normally fail first, giving 503) and changing it would alter an existing tested behaviour. Flagged for your decision (section 11).

Also noted: at registration, if the profile cannot be created but the registration hint was saved, the response is the same success-looking 201, relying on recovery at sign-in. That matches the live audit trail ([HANDOVER]: one DB_ERROR later RECOVERED), so I left it.

## 5. Migration reconciliation note

### 5.1 The discrepancy

`docs/REVIEW.md`, `README.md` and the 2026-10-21 owner report said the migration was **not yet recorded** in Prisma's `_prisma_migrations` history. [HANDOVER] reports that the live table **does** contain one completed, non-rolled-back record for `20261005000000_phase1_foundation`. Both cannot be true at the same time. I cannot read the live database, so I cannot say which is current. Possible explanations, none confirmed: the baseline was recorded after 2026-10-21 (by anyone), or Prisma recorded it when it ran, or the earlier statement was wrong.

### 5.2 What I checked

- **[REPO]** `prisma/migrations/20261005000000_phase1_foundation/migration.sql` has a single commit (`f160cff`, 2026-10-06). It has not changed since it was first imported. It has no CR characters (LF line endings).
- **[REPO]** SHA-256 of the file as committed (LF): `cd7315f51b54bb918bbf8a73b80993212b2b10d2c8fc42b3f4bc83c273851215`.
- SHA-256 if the same file is checked out with Windows CRLF line endings: `9801fc2830357b8a120aa6f196359087578aec8eb34b15b5783f9c46e9f0f525`.
- **[TEST]** Applying the file to a scratch PostgreSQL 16 creates 5 public tables with 44 columns, 9 constraints, 17 indexes and 4 enums, RLS on all five, no policies and no `anon`/`authenticated` privileges. On 2026-10-05 the migration was also compared with Prisma's own data model (237 checks: types, defaults, keys, indexes, foreign-key actions, enums) with no differences. I did not repeat that comparison today.
- **[TEST]** `docs/sql/phase1-readonly-checks.sql` (10 SELECT statements, no other statement type) runs cleanly on the scratch replica.

### 5.3 What I could not check

The live `_prisma_migrations` rows, the live table structure, and whether the live checksum matches the file. `prisma migrate diff` and `prisma migrate status` could not be used (engine downloads blocked here).

### 5.4 What the owner runs (read-only)

Run `docs/sql/phase1-readonly-checks.sql` in the Supabase SQL editor. It only reads. Share only the result rows (never keys or connection strings). Result 1 is the migration history. Use this table:

| Result 1 shows | Meaning | Action |
|---|---|---|
| One row, `finished_at` set, `rolled_back_at` empty, checksum equals the LF value above **or** the CRLF value | History is reconciled | **Do not run `migrate resolve`.** Record Outstanding item 1 as done in `docs/REVIEW.md` |
| One row, same conditions, but the checksum equals **neither** value | The recorded file differs from the repository file | **Stop. Do not edit anything.** Send me the result; the owner must approve any correction |
| One row with `finished_at` empty or `rolled_back_at` set | A failed or unfinished record | **Stop.** Send me the result |
| `relation "_prisma_migrations" does not exist`, or zero rows | No history yet | The baseline in `docs/SETUP_SUPABASE.md` section 5 is still outstanding (needs owner approval before running) |

Hint: `applied_steps_count` is usually 0 for a migration recorded with `migrate resolve --applied` and 1 when Prisma itself ran the SQL. That is my understanding of Prisma, not something I verified against your database.

Checksum caveat: my understanding is that Prisma stores the SHA-256 of the migration file's text, and that line endings can change it on Windows. That is why both values are given.

Results 2 to 5 give the live structure to compare with the replica counts above (44 columns, 9 constraints, 17 indexes for the five tables).

### 5.5 Exact action that still needs your approval

None to run until you return the Result 1 row. If the table shows "no history", the proposed single next step is the baseline command already documented in `docs/SETUP_SUPABASE.md` section 5, run from your own computer after the read-only checks. It records the migration and does not run its SQL.

### 5.6 Why `migration.sql` was not edited

You asked for the stale status comment at the top of the file to be corrected. I did not do that. If the live history already holds a checksum of the current file (which [HANDOVER] suggests), any change, even to a comment, would make the repository file differ from the recorded checksum and could trigger Prisma "migration was modified" warnings or prompts. The file is therefore treated as frozen (proposed decision DEC-048). The stale header remains a known contradiction; it can be corrected once Result 1 is known. The documentation, not the SQL file, is where the current status is recorded.

## 6. Security findings by severity

| Sev. | Finding | Evidence | Status / recommendation |
|---|---|---|---|
| **Critical (advisory rating)** | Production dependency `next` 15.5.25 has a critical advisory (unauthenticated RCE in the Image Optimization API when SVG files are used), a high advisory (DoS in App Router Server Actions) and two moderate cache-poisoning advisories for SSG/ISR. | **[TEST]** `npm audit` on the committed lockfile: production findings 1 critical, 7 high | Patch releases exist inside your current ranges: `next` 15.5.28 (range `^15.5.0` allowed it; the lockfile pinned 15.5.25). **Applied in the lockfile in this ZIP; needs your approval**, because merging deploys it. Context, not proof of safety: the codebase has no Server Actions, no `next/image`, no ISR or `revalidate`, and serves its one SVG as a static file [REPO]. I could not test exploitability |
| **High** | `zod` < 4.6.6 (memory exhaustion on oversized collections), `sharp` < 0.35.5 (librsvg advisory), `source-map-js` < 1.2.2 (event-loop DoS) | **[TEST]** same audit | Fixed by `zod` 4.6.7, `sharp` and `source-map-js` 1.2.2 via the lockfile update in this ZIP |
| **Medium** | `public._prisma_migrations` has RLS disabled and `anon`/`authenticated` SELECT. Anyone with the public anon key can read migration names and checksums. Low sensitivity, but unnecessary exposure | **[HANDOVER]** (and Supabase advisor "Error") | **Not changed.** Proposed fix below. Needs your approval. Tested on the scratch replica: the API roles are blocked, the owner role still reads and writes, and the rollback restores the previous state |
| **Medium** | Per-IP rate limiting uses the **leftmost** `X-Forwarded-For` value (`getClientIp`). If the host's proxy appends the real address on the right, a client can send its own header and dodge the per-IP and per-email login limits | **[REPO]** `lib/security/http.ts`. I could not check how Render sets the header | Not changed. Needs a decision (section 11). Supabase's own auth rate limits still apply |
| **Medium** | No Content-Security-Policy header | **[REPO]** `next.config.ts` | Known deferral. Add before a public launch |
| **Low / Medium** | Session cookies are readable by browser scripts (`httpOnly: false` is the library default; the app does not override it) | **[REPO]** and installed `@supabase/ssr` 0.7.0 | The app only reads sessions on the server, so `httpOnly` could be enabled. Combined with no CSP it widens the impact of any script injection. Not changed; owner decision |
| **Low** | Supabase leaked-password protection disabled | **[HANDOVER]** advisor warning | Recommended. May require a paid Supabase plan: check before changing. The app already enforces 10 characters. Not changed |
| **Low** | In-memory rate limiter resets on restart and is per instance | **[REPO]**, documented | Accepted for the MVP |
| **Low** | Remaining production advisories: `postcss` (bundled by Next 15; fix needs Next 16), `@prisma/config` and `deepmerge-ts` (Prisma CLI; fix needs Prisma 7) | **[TEST]** | Build-time and CLI-time packages. Deferred: they need major upgrades |
| **Low** | Dev-only advisories: `vitest` (critical), `tinypool` (critical), `vite` (high), `@vitest/mocker` (moderate). Unchanged by this work | **[TEST]** | Test tooling only, not in production. Fixes need a major `vitest` upgrade. Deferred. Do not run the dev tools on untrusted code |
| **Info** | Five tables default-deny with no policies, as intended; server-side role checks; the service-role key is used by one server route only; no secrets in the repository | **[REPO]**, **[TEST]** (static tests) | Verified in code. Live RLS state is [HANDOVER], not verified by me |

Proposed hardening for `public._prisma_migrations` (**NOT executed; needs your explicit approval**; run in the Supabase SQL editor):

```sql
revoke all on table public._prisma_migrations from anon, authenticated;
alter table public._prisma_migrations enable row level security;
```

Rollback (restores the previous state):

```sql
alter table public._prisma_migrations disable row level security;
grant all on table public._prisma_migrations to anon, authenticated;
```

Do not add any policy. I tested these on plain PostgreSQL 16, not on Supabase, so check afterwards that the application and any later `prisma migrate` still work.

## 7. Tests and build

All commands ran in my sandbox on 2026-10-25. Prisma commands used stub engines (section 2).

| Command | Unmodified `main` | With this work |
|---|---|---|
| `npm ci --ignore-scripts` | exit 0 | exit 0 |
| `npx prisma validate` | exit 0 | exit 0 |
| `npx prisma generate` | exit 0 | exit 0 |
| `npm run lint` | exit 0 | exit 0 |
| `npm run typecheck` | exit 0 | exit 0 |
| `npm test` | 124 tests: 123 passed, **1 failed** | 162 tests: 161 passed, **1 failed** (the same one) |
| `npm run build` | exit 0 | exit 0 |
| Production smoke test (`next start`) | n/a | login notices render; unauthenticated API returns 401; protected page redirects to `/login` |
| `npm audit` (production dependencies) | 8 findings: 1 critical, 7 high | 5 findings: 0 critical, 4 high, 1 moderate (`next`'s bundled `postcss`, and the Prisma CLI packages: need Next 16 / Prisma 7) |
| `npm audit` (all dependencies) | 12: 3 critical, 8 high, 1 moderate | 9: 2 critical, 5 high, 2 moderate (all remaining critical ones are dev-only test tooling) |

The one failing test is `repository hygiene: no public file may collide with an app route`. It fails because `public/icon.svg` and `app/icon.svg` both exist in the repository. That is a repository state problem, not a code problem: deleting `public/icon.svg` makes it pass. With `public/icon.svg` removed, all 162 tests pass (13 files). A ZIP cannot delete files, so you must do it.

New tests: 38 (db-failure 15, audit-failure 5, recovery-logging 1, check-env 17). The 10 behaviour tests for fixes F1 to F4 were confirmed to **fail on the original code** and pass on the fixed code. No existing test was deleted or weakened. One of my own new test expectations was corrected during the work: it wrongly required the database host to be hidden from logs, but the existing design keeps the host (and removes user name and password) so operators can see which server was used.

## 8. Changes made (files)

- **Fixes:** `app/api/auth/login/route.ts`, `app/auth/callback/route.ts`, `lib/auth/guards.ts`, `lib/auth/session.ts`, `lib/security/http.ts`, `app/(auth)/login/page.tsx` (notice text), new `lib/db/errors.ts`.
- **Tool:** new `check-env.mjs` (database-URL structure checks, no printing of values).
- **Dependencies:** `package.json`, `package-lock.json` (`next` ^15.5.28, `zod` ^4.6.7, lockfile `sharp` and `source-map-js`). Patch-level, inside the existing ranges, no new packages, no paid services.
- **Tests:** four new test files (above).
- **Documentation:** this report, `docs/sql/phase1-readonly-checks.sql`, a handover back, and updates to REVIEW, README, ROADMAP, SETUP_SUPABASE, SETUP_RENDER, TROUBLESHOOTING, DATABASE, DECISIONS, CHANGELOG and the Phase 1 handover.
- **Not changed:** `prisma/schema.prisma`, `migration.sql`, seed, `.github/`, anything live.

## 9. Not tested, and why

- Registration, e-mail confirmation, login, logout and role dashboards against **real Supabase** and a **real database**: no access, and the handover forbids creating live accounts without approval. All of these are tested only with mocks.
- Render's current variables, deployment and logs: no access.
- The live schema and migration history: no access.
- The real Prisma engines: blocked in my sandbox.
- The `X-Forwarded-For` behaviour on Render: no access.
- Exploitability of the `next` advisories: not tested.

**Proposed live acceptance test for the owner (needs your approval, creates one account and sends one e-mail):** on a production-like environment, register a new customer with a fresh e-mail address, confirm the e-mail, sign in, open `/customer/dashboard`, try `/admin/dashboard` (must redirect), sign out; then try a wrong password once. Report only what you saw on screen.

## 10. Delivery and the "do not merge to main" boundary

I could not push to GitHub and did not. The work is delivered as a ZIP. **Be careful:** your `_inbox` workflow commits an uploaded ZIP straight to `main`, and Render deploys from `main`. Uploading it there is effectively merging it and deploying it, including the dependency update. To keep it off `main` until reviewed, extract the ZIP into a checkout of the branch `handover/phase-1-stabilisation-2026-10-24`, review the diff, and open or update the pull request instead.

## 11. Owner decisions required

1. Approve (or not) the dependency patch update, knowing that merging deploys it.
2. Run `docs/sql/phase1-readonly-checks.sql` (read-only) and send me the result rows, especially Result 1.
3. Approve (or not) the `_prisma_migrations` hardening SQL in section 6.
4. Decide how to handle the leftmost `X-Forwarded-For` trust: confirm how Render sets the header, then choose a rule.
5. Decide whether to make the session cookies `httpOnly` and when to add a CSP.
6. Check whether Supabase leaked-password protection is available on your plan before enabling it.
7. Decide whether a database failure *during* profile recovery should show "unavailable" instead of "setup incomplete".
8. Delete `public/icon.svg` (and the stray `docs/*.tsx`, `docs/globals.css`, `docs/icon.svg`) in the repository.
9. Approve and perform (or not) the live acceptance test in section 9.
10. Check Render's current `DATABASE_URL` locally with `node check-env.mjs`; if it reports a problem, approve the correction procedure in `docs/SETUP_RENDER.md` section 3.

## 12. Unresolved blockers

- The migration-history discrepancy (needs Result 1).
- The cause of the 2026-10-23 database-string error (needs a check of Render's value).
- Live registration, confirmation, login and Render deployment: unverified.
- The stale header comment in `migration.sql` (frozen until the history is known).

## 13. Definition of Phase 1 complete (handover section 6): status

| Requirement | Status |
|---|---|
| Database URL and connectivity verified without exposing secrets | **Not verified.** Tool and tests provided; the live value not checked |
| Registration, confirmation, login, logout, profile recovery and role protection tested | **Tested with mocks only.** Not tested live |
| Migration history and schema reconciled without unsafe execution | **Not reconciled.** Read-only checks prepared; results needed |
| Security findings remediated with approval or accepted by the owner | **Open.** Decisions listed above |
| Automated tests, type and lint checks, production build recorded | **Done**, with one failing test caused by repository state (`public/icon.svg`) |
| Setup and review docs match the repository and live-state evidence | **Updated** to the evidence available; live facts are marked as reported, not verified |
| Owner has reviewed and approved the required live changes | **Not yet** |

Phase 1 therefore remains **PARTIALLY COMPLETE**.
