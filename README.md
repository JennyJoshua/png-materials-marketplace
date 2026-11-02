# PNG Marketplace

(Repository name: `png-materials-marketplace`. The name is kept for now; a public brand can be decided separately.)

A mobile-first web app (PWA-ready) that is planned to connect people and organisations across Papua New Guinea who want to buy goods or pay for services with the providers who can supply them.

Building materials were the starting point and remain an important category. The project is now planned as a wider marketplace for goods **and** services. The scope was expanded on 2026-10-21; that change is documentation only.

**Current version:** 0.1.0. Current delivery stage: Phase 4 — Marketplace experience.



> **Current implementation status — 2 November 2026 (supersedes older phase-status statements below):** Phases 1 and 2 are implemented. The Phase 3 product-marketplace backend is deployed and its production migration was verified by the project owner. Phase 4 is being developed on `feature/phase-4-marketplace-experience`; the draft PR adds the public catalogue, product details, provider listing workspace and launch presentation. The deployed application was confirmed functioning by the owner. Current agreed roadmap: Phase 4 marketplace experience; Phase 5 enquiries and quotations; Phase 6 orders and transaction management; Phase 7 trust and reputation; Phase 8 payments/business tools (deferred pending PNG suitability and approval); Phase 9 expansion and intelligent services.

## Who it serves

**Buyers** are individuals, households, businesses, schools, churches, government institutions, NGOs and other organisations that purchase goods or pay for services.

**Providers** are of three types:

- **Product businesses**: hardware stores, supermarkets, wholesalers, retailers, agricultural suppliers, clothing and electronics shops, and other sellers of physical goods.
- **Individual service providers**: mechanics, electricians, plumbers, cleaners, carpenters, builders, gardeners, tutors, photographers, repairers and other professionals.
- **Businesses offering goods and services**: for example an equipment supplier that also installs or repairs.

**Administrators** manage users, providers, categories, listings, complaints and reports.

The planned design uses **one account** for everyone: a person should not need separate accounts to buy and to provide. The platform facilitates transactions. It is not the seller of every product or the employer of every service provider. Providers control their own prices and availability. Online payments are deferred.

Phase 1 still uses the original roles (Customer, Supplier, Admin). How the account model grows to cover buyers and providers of all three types is proposed in `docs/ARCHITECTURE.md` (Part C) and will be decided in Phase 2.

## Status at a glance

| | |
|---|---|
| **Implemented (Phases 1–3)** | Authentication and profiles; provider foundation; product listing backend, public APIs, provider management APIs and administrator moderation. Phase 3 is deployed and its production migration was verified by the owner. |
| **Verified (live Supabase, reported by the project owner 2026-10-21)** | The Phase 1 migration SQL was applied manually; the category seed ran (exactly 15 ACTIVE product categories); Row Level Security was enabled and checked on all five Phase 1 tables, with no policies and `anon`/`authenticated` privileges revoked (default-deny). Supabase Auth: email and email confirmation enabled, anonymous sign-ins disabled |
| **Phase 4 (in progress)** | Public catalogue, search/filtering, product detail pages, provider listing workspace and launch polish. See the current roadmap and draft PR. |
| **Planned (Phases 5–9)** | Customer enquiries and supplier quotations; orders and transaction management; trust/reputation; payments and business tools (deferred pending PNG suitability); expansion and intelligent services. |
| **Future** | Online payments (after evaluation for Papua New Guinea), delivery marketplace, AI material suggestions, price intelligence, multi-supplier checkout, provider subscriptions and featured listings (options to evaluate) |

Not implemented in the current release: customer enquiries and quotations, orders, bookings, reviews, complaints/disputes, payments, delivery workflows and AI features. Product listings, provider profiles, product search and price comparison are implemented; Phase 4 completes their public-facing experience.

**Current verification status:** The owner confirmed that the deployed Render application is functioning. The Phase 3 production migration was applied and verified by the owner. Older Phase 1 verification details remain in `docs/REVIEW.md` and `docs/PHASE_1_VERIFICATION_REPORT.md` as historical records; they should not be interpreted as the current project phase.

## Architecture

```
GitHub -> Render (web service) -> Next.js app (frontend + API) -> Supabase
                                                                   |- Auth
                                                                   |- PostgreSQL (via Prisma)
                                                                   |- Storage (future files)
```

| Concern | Technology |
|---|---|
| App | Next.js 15 (App Router), React 19, TypeScript |
| Authentication | Supabase Auth (the app never stores passwords) |
| Database | Supabase PostgreSQL |
| ORM | Prisma |
| Storage | Supabase Storage (foundation only) |
| Tests / lint | Vitest, ESLint |
| Hosting | Render |
| Source control | GitHub |

No microservices. See `docs/ARCHITECTURE.md` for the design and `docs/DECISIONS.md` for why.

## Development phases

1. **Foundation** — implemented.
2. **Provider foundation** — implemented.
3. **Product marketplace backend** — implemented and deployed.
4. **Marketplace experience** — in progress.
5. **Customer enquiries and supplier quotations** — planned.
6. **Orders and transaction management** — planned.
7. **Trust, verification and reputation** — planned.
8. **Payments and business tools** — deferred pending PNG suitability assessment and owner approval.
9. **Expansion and intelligent services** — future.

Phases are built sequentially, with a separate specification, tests and owner approval gates for production changes.

## Local development

**Requirements:** Node.js 20.19 or newer, npm, a Supabase project (see below).

```bash
git clone https://github.com/JennyJoshua/png-materials-marketplace.git
cd png-materials-marketplace
npm install                 # also runs `prisma generate`
cp .env.example .env        # then fill in the values (see "Environment variables")
npm run dev                 # http://localhost:3000
node check-env.mjs          # checks .env (names, lengths, database-URL structure); never prints secrets
```

### Database: read this before running any Prisma migrate command

The Phase 1 migration SQL was **applied manually** to the live Supabase database, and the 15 product categories are already seeded. Whether Prisma's migration history (`_prisma_migrations`) already records it is **under reconciliation**: do not assume either way. Run the read-only checks in `docs/sql/phase1-readonly-checks.sql` and follow `docs/PHASE_1_VERIFICATION_REPORT.md` section 5.4. Do not edit `migration.sql`, even its comments: its checksum may already be recorded.

**Do not run `npx prisma migrate deploy`, `migrate dev`, `migrate reset` or `db push` against the existing live database** until the history is reconciled. `migrate deploy` would try to run the migration SQL again and fail; the others can change or erase data. Follow the baseline procedure in `docs/SETUP_SUPABASE.md` section 5. Running the seed again is not needed.

### Supabase setup

The live Supabase project already exists. For a new project, collect the URL, keys and connection strings, configure email confirmation and redirect URLs, and create the first administrator by following **`docs/SETUP_SUPABASE.md`**. Administrators cannot register publicly.

### Environment variables

Copy `.env.example` to `.env` and fill in the values. Names only are committed.

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Supabase transaction pooler (port 6543, `?pgbouncer=true`) |
| `DIRECT_URL` | Direct (5432) or session-pooler string, for Prisma CLI and migration commands |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret**, server only |
| `NEXT_PUBLIC_SITE_URL` | Optional; public site URL for confirmation links |

### Database commands

| Command | Purpose |
|---|---|
| `npm run db:validate` | Validate `prisma/schema.prisma` |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:migrate:deploy` | `prisma migrate deploy`. **Do not run against the existing live database** until the baseline is done. For empty databases and, after the baseline, for new reviewed migrations |
| `npm run db:migrate` | `prisma migrate dev`. **Never against the live database** |
| `npx prisma migrate status` | Read-only: shows what Prisma thinks is applied |
| `npx prisma migrate resolve --applied 20261005000000_phase1_foundation` | **Only if** the read-only check shows Prisma has no record of the migration, and only with the owner's approval. It records the migration; it does not run the SQL. If a matching record already exists, do not run it |
| `npm run db:seed` | Seed the product categories (already done on the live database) |
| `npm run db:studio` | Browse data locally |

### Tests, lint, type check, build

```bash
npm test            # Vitest. Needs no credentials: Supabase and Prisma are mocked
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run build       # production build
npm start           # run the production build
```

## Deployment target

Render web service connected to this GitHub repository, using Supabase for Auth and PostgreSQL. The owner confirmed that the deployed application is functioning. Production configuration and deployment changes remain approval-gated. Steps are in **`docs/SETUP_RENDER.md`**.

## Security rules

- **Never commit secrets.** `.env`, `.env.local` and `.env.*.local` are git-ignored; only `.env.example` (names only) is tracked. The service-role key is server-only and never prefixed `NEXT_PUBLIC_`.
- Passwords exist only in Supabase Auth.
- The role in the application database (`users.role`) is authoritative. It is never taken from the browser or from Supabase `user_metadata`.
- Every protected page and API route re-checks identity (`getUser()`) and role on the server. Middleware alone is never relied on.
- Row Level Security is enabled on every public table with no policies; the app reaches the database only through server-side Prisma.
- The in-memory rate limiter is per instance and resets on restart. It is a foundation, not distributed protection.

## Documentation

| File | Contents |
|---|---|
| `docs/PROJECT_REQUIREMENTS.md` | Purpose, account model, planned functions and detailed requirements (most of it planned) |
| `docs/ROADMAP.md` | Phases, dependencies, exit criteria and Phase 1 outstanding work |
| `docs/ARCHITECTURE.md` | Phase 1 architecture (Part A), earlier planned design (Part B), proposed goods-and-services design (Part C) |
| `docs/DATABASE.md` | Phase 1 tables, plus planned tables |
| `docs/DECISIONS.md` | Architecture and product decisions |
| `docs/SETUP_SUPABASE.md` | Manual Supabase steps, admin creation, RLS check |
| `docs/SETUP_RENDER.md` | Render deployment plan |
| `docs/CHANGELOG.md` | What changed |
| `docs/REVIEW.md` | Review report with actual test results |
| `handovers/PHASE_1_HANDOVER.md` | Phase 1 specification and completion record |
