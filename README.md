# PNG Marketplace

(Repository name: `png-materials-marketplace`. The name is kept for now; a public brand can be decided separately.)

A mobile-first web app (PWA-ready) that is planned to connect people and organisations across Papua New Guinea who want to buy goods or pay for services with the providers who can supply them.

Building materials were the starting point and remain an important category. The project is now planned as a wider marketplace for goods **and** services. The scope was expanded on 2026-10-21; that change is documentation only.

**Current version:** 0.1.0, **Phase 1: Foundation**. This is an account and database foundation, not a working marketplace yet. Nothing about products, services, quotations, orders or bookings is built.

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
| **Implemented (Phase 1)** | Customer and supplier registration; sign in and sign out; email-confirmation handling; three role dashboards (`/customer/dashboard`, `/supplier/dashboard`, `/admin/dashboard`) that show account details and a "coming later" notice; server-side role checks; five database tables with Row Level Security; category seed; audit-log foundation; basic rate limiting; security headers; tests |
| **Verified (live Supabase, reported by the project owner 2026-10-21)** | The Phase 1 migration SQL was applied manually; the category seed ran (exactly 15 ACTIVE product categories); Row Level Security was enabled and checked on all five Phase 1 tables, with no policies and `anon`/`authenticated` privileges revoked (default-deny). Supabase Auth: email and email confirmation enabled, anonymous sign-ins disabled |
| **Outstanding (Phase 1)** | Prisma migration-history baseline (the migration is not yet recorded in `_prisma_migrations`); safe verification of Prisma connectivity and migration status; live sign-up, email-confirmation and sign-in testing; confirmation of Render deployment and production configuration (deployment status is unconfirmed) |
| **Planned (Phases 2 to 6)** | General marketplace data model; product marketplace (listings, prices, search, comparison); services marketplace (service listings, areas, enquiries, bookings); quotations, orders and bookings, notifications, reviews and complaints; business development options |
| **Future** | Online payments (after evaluation for Papua New Guinea), delivery marketplace, AI material suggestions, price intelligence, multi-supplier checkout, provider subscriptions and featured listings (options to evaluate) |

Not implemented yet: product listings, service listings, search, price comparison, provider profiles beyond the Phase 1 supplier profile, enquiries, quotation requests (RFQs), quotations, orders, bookings, reviews, complaints, provider verification, payments, delivery, AI features, a password-reset page, and an administrator screen beyond read-only account counts. Dashboard tiles for these are labelled "Not available yet" and are not links.

**Verification status:** Phase 1 is **PARTIALLY COMPLETE**, not fully complete. The migration SQL was applied to the live Supabase database manually, but Prisma's migration history has not yet been baselined, and live sign-up, email confirmation and sign-in testing and the Render deployment still need confirmation. Default-deny RLS on the five tables does not on its own prove that the complete application is secure. The current position is in `docs/REVIEW.md` ("Current status") and `docs/ROADMAP.md`. Phase 2 has not started.

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

1. **Foundation** (implemented; partially complete)
2. General marketplace data model (design first)
3. Product marketplace
4. Services marketplace
5. Transactions and trust
6. Business development

Phases are built one after another, not at the same time. Each phase needs its own specification, adds its own database tables and migration, and has its own tests. Do not start a later phase without a separate specification. Dependencies and exit criteria are in `docs/ROADMAP.md`.

## Local development

**Requirements:** Node.js 20.9 or newer, npm, a Supabase project (see below).

```bash
git clone https://github.com/JennyJoshua/png-materials-marketplace.git
cd png-materials-marketplace
npm install                 # also runs `prisma generate`
cp .env.example .env        # then fill in the values (see "Environment variables")
npm run dev                 # http://localhost:3000
```

### Database: read this before running any Prisma migrate command

The Phase 1 migration SQL was **applied manually** to the live Supabase database, and the 15 product categories are already seeded. Prisma's migration history (`_prisma_migrations`) has **not** been baselined yet.

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
| `npx prisma migrate resolve --applied 20261005000000_phase1_foundation` | The baseline. Run once, only after the checks in `docs/SETUP_SUPABASE.md` section 5. It records the migration; it does not run the SQL |
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

Render web service connected to this GitHub repository, using Supabase for Auth, PostgreSQL and Storage. Steps are in **`docs/SETUP_RENDER.md`**. Deployment status is unconfirmed in the available evidence: this README does not record it as completed or as definitively outstanding.

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
