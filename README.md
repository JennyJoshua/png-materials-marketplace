# PNG Materials Marketplace

A mobile-first web app (PWA-ready) that will connect customers with hardware stores and building-material suppliers in Papua New Guinea.

**Current version:** 0.1.0, **Phase 1: Foundation**. This is an account and database foundation, not a working marketplace yet.

## Who it serves

- **Customers** (builders, households, contractors) who will find materials, compare supplier prices and request quotations.
- **Suppliers** (hardware stores, wholesalers) who will list products, set their own prices and stock, and answer quotation requests.
- **Administrators** who manage users, suppliers and categories.

The platform facilitates the transaction. Suppliers stay responsible for their products, prices, stock, quotations and fulfilment.

## Status at a glance

| | |
|---|---|
| **Implemented (Phase 1)** | Customer and supplier registration; sign in and sign out; email-confirmation handling; three role dashboards (`/customer/dashboard`, `/supplier/dashboard`, `/admin/dashboard`) that show account details and a "coming later" notice; server-side role checks; five database tables with Row Level Security; category seed; audit-log foundation; basic rate limiting; security headers; tests |
| **Planned (Phases 2 to 7)** | Supplier portal, customer marketplace, quotation requests (RFQs), quotations, orders, testing and deployment hardening |
| **Future** | Online payments, delivery marketplace, AI material suggestions, price intelligence, multi-supplier checkout |

Not implemented yet: product catalogue, product search, price comparison, projects, material lists, RFQs, quotations, orders, payments, delivery, AI features, a password-reset page, and an administrator screen beyond read-only account counts. Dashboard tiles for these are labelled "Not available yet" and are not links.

**Not yet verified in this repository:** the migration has not been applied to a Supabase database, the seed has not been run, and the app has not been deployed to Render. See `docs/REVIEW.md` for exactly what was and was not tested.

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

1. **Foundation** (this phase)
2. Supplier portal
3. Customer marketplace
4. RFQ engine
5. Quotation engine
6. Orders
7. Testing and deployment

Each phase adds its own database tables and migration. Do not start a later phase without a separate specification.

## Local development

**Requirements:** Node.js 20.9 or newer, npm, a Supabase project (see below).

```bash
git clone https://github.com/JennyJoshua/png-materials-marketplace.git
cd png-materials-marketplace
npm install                 # also runs `prisma generate`
cp .env.example .env        # then fill in the values (see "Environment variables")
npx prisma migrate deploy   # apply the migration to your Supabase database
npm run db:seed             # insert the 15 product categories (safe to repeat)
npm run dev                 # http://localhost:3000
```

### Supabase setup

Create a Supabase project, collect the URL, keys and connection strings, configure email confirmation and redirect URLs, and create the first administrator by following **`docs/SETUP_SUPABASE.md`**. Administrators cannot register publicly.

### Environment variables

Copy `.env.example` to `.env` and fill in the values. Names only are committed.

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Supabase transaction pooler (port 6543, `?pgbouncer=true`) |
| `DIRECT_URL` | Direct (5432) or session-pooler string, for migrations |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret**, server only |
| `NEXT_PUBLIC_SITE_URL` | Optional; public site URL for confirmation links |

### Database commands

| Command | Purpose |
|---|---|
| `npm run db:validate` | Validate `prisma/schema.prisma` |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:migrate:deploy` | Apply committed migrations (use this against Supabase) |
| `npm run db:migrate` | `prisma migrate dev` (development databases only) |
| `npm run db:seed` | Seed the product categories |
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

Render web service connected to this GitHub repository, using Supabase for Auth, PostgreSQL and Storage. Steps are in **`docs/SETUP_RENDER.md`**. Deployment has not been performed.

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
| `docs/PROJECT_REQUIREMENTS.md` | Full MVP requirements (most of it planned) |
| `docs/ARCHITECTURE.md` | Phase 1 architecture, plus planned design |
| `docs/DATABASE.md` | Phase 1 tables, plus planned tables |
| `docs/DECISIONS.md` | Architecture and product decisions |
| `docs/SETUP_SUPABASE.md` | Manual Supabase steps, admin creation, RLS check |
| `docs/SETUP_RENDER.md` | Render deployment plan |
| `docs/CHANGELOG.md` | What changed |
| `docs/REVIEW.md` | Review report with actual test results |
| `handovers/PHASE_1_HANDOVER.md` | Phase 1 specification and completion record |
