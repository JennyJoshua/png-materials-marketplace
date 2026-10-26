PNG Materials Marketplace

Architecture & Product Decisions

---

DEC-001 — Mobile-first Web Application

Decision

Build the first product as a responsive web application/PWA rather than a native Android application.

Reason

The target users may access the system through:

- Android phones
- Tablets
- Desktop computers
- Laptops

A responsive web application reduces development and maintenance complexity.

---

DEC-002 — PostgreSQL

Decision

Use PostgreSQL as the primary database. (Hosted on Supabase; see DEC-017 to DEC-019.)

Reason

The application contains relational data involving:

- Users
- Suppliers
- Products
- Projects
- RFQs
- Quotations
- Orders

PostgreSQL provides strong relational integrity and can scale beyond the MVP.

---

DEC-003 — Single Application Initially

Decision

Use one deployable application initially.

Reason

Microservices would add unnecessary complexity at MVP stage.

Split services only if future scale or technical requirements justify it.

---

DEC-004 — Supplier-Controlled Prices

Decision

Suppliers control their own marketplace prices.

Reason

The platform cannot reliably assume a universal price for a product.

Every displayed marketplace price belongs to a specific supplier and has an update timestamp.

---

DEC-005 — Supplier-Controlled Stock Status

Decision

Initial stock information uses simple statuses.

IN_STOCK
LIMITED_STOCK
OUT_OF_STOCK
CONTACT_SUPPLIER

Reason

Requiring exact inventory quantities would make onboarding unnecessarily difficult.

---

DEC-006 — No Price Scraping

Decision

Do not build automated scraping of hardware-store websites as part of the MVP.

Reason

The marketplace's primary catalogue data should come directly from participating suppliers.

---

DEC-007 — RFQ as a Core Feature

Decision

Customers can send one materials list to multiple suppliers.

Reason

This is one of the central value propositions of the platform.

---

DEC-008 — Catalogue Price vs Quotation Price

Decision

A supplier's catalogue price and RFQ quotation price are separate records.

Example:

Catalogue:

Cement = K40

RFQ:

Cement = K38

The RFQ quotation price applies only to that quotation.

---

DEC-009 — Historical Order Prices

Decision

Orders preserve the agreed prices at the time of ordering.

Reason

Changing a supplier's catalogue price must never change an existing order.

---

DEC-010 — Payments Deferred

Decision

Online payments are not included in the first MVP.

Reason

The marketplace should first prove the core workflow:

Search
→ RFQ
→ Quotation
→ Order

Payment integration can be added later.

---

DEC-011 — Delivery Deferred

Decision

MVP supports:

- Pickup
- Supplier delivery

A transport marketplace is a future module.

---

DEC-012 — AI Deferred

Decision

AI-assisted project/material generation is future functionality.

Reason

The initial system should establish reliable supplier and transaction data before adding AI-generated estimates.

---

DEC-013 — Customer Makes the Decision

Decision

The platform presents factual information but does not automatically declare a supplier "best."

Reason

Supplier selection depends on factors including:

- Price
- Stock
- Location
- Delivery
- Product specification
- Customer preference

The customer makes the final decision.

---

DEC-014 — Verification Meaning

"Verified supplier" means the platform completed its defined verification process.

It does not mean the platform guarantees:

- Product quality
- Prices
- Stock
- Delivery
- Warranty
- Business performance

---

DEC-015 — Development Assumptions

Formal market interviews are not required before the initial MVP.

The first version will use intelligent assumptions about customer and supplier needs.

Real user behaviour during MVP testing will be used to refine those assumptions.

---

DEC-016 — No Premature Complexity

Do not introduce:

- Microservices
- Elasticsearch
- Complex inventory systems
- Payment infrastructure
- Logistics infrastructure

unless a documented requirement justifies them.

---

# Decisions added on 2026-10-05 (Phase 1 reconciliation)

---

DEC-017 — Locked architecture

Decision

GitHub → Render → Next.js → Supabase, with:

- Supabase Auth (authentication)
- Supabase PostgreSQL (database)
- Supabase Storage (future files)
- Prisma (ORM)

Reason

A relatively simple architecture suited to an early MVP, avoiding unnecessary infrastructure. It replaces the earlier plan in which the application managed its own passwords and sessions.

---

DEC-018 — Hosting: Render, not Vercel Hobby

Decision

Render is the application host. Supabase is the backend data, auth and storage platform. Vercel Hobby is not used for this business MVP. Microservices are not required.

Reason

The Vercel Hobby plan is intended for personal, non-commercial use, and this is a business MVP. One Render web service running the Next.js app, plus Supabase, keeps hosting to two services.

---

DEC-019 — Single Next.js application

Decision

Frontend and backend are one Next.js application (Route Handlers under /api and /auth). This extends DEC-003.

---

DEC-020 — Authentication is Supabase Auth only

Decision

Passwords, sessions and confirmation/recovery email are handled by Supabase Auth. The application has no password column, no password hash, no custom JWT signing and no second password system. bcryptjs and jose were removed.

Server code verifies identity with getUser(), never getSession().

---

DEC-021 — Roles and role authority

Decision

Roles are CUSTOMER, SUPPLIER and ADMIN. The authoritative role is users.role in the application database. It is never read from the client, from a request body, or from user_metadata. ADMIN cannot be chosen at public registration.

app_metadata.registration_type (service-role write only) is used solely to rebuild a failed profile, and never for ADMIN.

---

DEC-022 — Middleware checks identity; pages and APIs check the role

Decision

Middleware refreshes the session and requires a verified user for the three protected areas. Role checks happen in server pages and API routes against the database role.

Reason

Middleware cannot query the database, and copying the role into token metadata would let it go stale. This avoids relying on middleware alone, and it also means no role claim has to be trusted at the edge.

---

DEC-023 — Registration strategy

Decision

Server-side profile creation at registration (Option A), with recovery at sign-in and in /auth/callback (Option B as a safety net). Profile creation is idempotent and keyed by the Supabase user UUID. Registration works with email confirmation enabled and does not depend on signUp() returning a session.

---

DEC-024 — Row Level Security

Decision

RLS is enabled on every public application table, with no policies, and table privileges are revoked from the anon and authenticated roles. Prisma reaches the database through a privileged connection; server-side authorization remains mandatory.

Reason

Supabase exposes public tables through its REST API using the public anon key. Default-deny prevents accidental exposure.

---

DEC-025 — users.id is the Supabase Auth UUID, with no foreign key to auth

Decision

users.id holds the Supabase Auth user UUID with no database default. There is no foreign key to the Supabase-managed auth schema, which Prisma must not manage.

---

DEC-026 — Each phase adds its own tables

Decision

Phase 1 creates five tables: users, customer_profiles, supplier_profiles, product_categories, audit_logs. Later phases add their own tables and migrations. Unused tables are not created in advance.

Reason

Every table in the database is then covered by implemented, tested code.

---

DEC-027 — Admin creation is a manual, controlled step

Decision

No admin account or password is seeded. An administrator registers normally, confirms their email, and is promoted by a documented SQL statement run by the project owner (docs/SETUP_SUPABASE.md).

---

DEC-028 — Rate limiting is in memory in Phase 1

Decision

An in-memory limiter protects register and login. It is per instance and resets on restart, so it is not distributed protection. Supabase also rate-limits its auth endpoints. A shared store can replace it later.

---

DEC-029 — Password reset deferred

Decision

Password reset is Supabase Auth functionality. A reset UI is deferred to a later authentication refinement. This is deliberate, not an omission.

---

DEC-030 — Migration applied manually

Status: Superseded on 2026-10-21 by DEC-046. Kept as history. Do not follow the instruction below.

Decision (historical)

The Phase 1 migration is generated but not applied. The project owner applies it with prisma migrate deploy once the Supabase project exists.

---

# Decisions added on 2026-10-21 (scope expansion: goods and services)

Status key

- Approved: decided by the project owner.
- Proposed: a recommendation that has not been approved. It may change.

These decisions change documentation only. No code, schema, migration, authentication logic, dependency or workflow is changed by them.

---

DEC-031 - Expand to a general goods-and-services marketplace

Status: Approved

Decision

The platform connects people and organisations across Papua New Guinea who want to buy goods or pay for services with providers who can supply them. Building materials remain an important first category within a wider marketplace.

Reason

The same account, quotation, order and trust foundations serve products and services. Limiting the platform to building materials would leave out many local providers and buyers.

---

DEC-032 - Providers and buyers

Status: Approved

Decision

Three provider types are supported: product businesses, individual service providers, and businesses offering both goods and services. Buyers include individuals, households, businesses, schools, churches, government institutions, NGOs and other organisations.

---

DEC-033 - One account system

Status: Approved

Decision

The platform is built around a single account system. A person does not need separate accounts to buy and to provide. User account, buyer capability, provider profile, provider type and administrator are documented as separate concepts.

---

DEC-034 - users.role is unchanged in Phase 1

Status: Approved

Decision

The existing users.role (CUSTOMER, SUPPLIER, ADMIN), the server-side guards, the identity-only middleware, the registration rules (no public ADMIN) and the Row Level Security setup are not changed by the scope expansion. Extends DEC-021 and DEC-022.

Reason

The Phase 1 authentication and role model is secure and must not be casually redesigned.

---

DEC-035 - Future capability model: derive provider capability from a provider profile

Status: Proposed

Decision

Recommended for Phase 2: keep users.role as the platform privilege, treat every active user as a buyer, and derive provider capability from owning a provider profile that is looked up in the database on the server. Check resource ownership on every request. Never take a role or capability from the client or from user_metadata. See ARCHITECTURE.md Part C2 for the options and the decisions still needed (the fate of the SUPPLIER value, one or several profiles per user, staff accounts, and how supplier_profiles relates to a provider profile).

Reason

It supports users who are both buyers and providers without a second account, avoids a combinatorial list of roles, and keeps the existing server-side permission checks.

Implementation requires explicit approval in a later phase.

---

DEC-036 - The platform facilitates; providers control prices

Status: Approved

Decision

The platform is not the seller of every product and not the employer of every service provider. Providers control their own prices and availability. Extends DEC-004, DEC-005 and DEC-013.

---

DEC-037 - Kinds of price, and preserved agreed prices

Status: Approved

Decision

Catalogue prices (products), indicative rates (services) and quotation-specific prices are kept distinct. Buyers can request quotations before committing. The agreed price and important transaction details are preserved on the order or booking. Extends DEC-008 and DEC-009. Estimated or AI-generated prices are never shown as provider prices.

---

DEC-038 - Verification

Status: Approved (principle), Proposed (levels)

Decision

A provider is labelled verified only if the platform has actually completed the verification process defined for that label. Extends DEC-014.

Proposed: separate verification levels, each labelled with exactly what was checked (for example contact details confirmed, identity or business documents checked), to be defined in Phase 2.

---

DEC-039 - Payments remain deferred

Status: Approved

Decision

Online payment processing is deferred until a suitable approach has been evaluated for Papua New Guinea. Initially buyer and provider arrange payment directly and the platform records statuses. Possible payment methods (bank transfer, mobile money, card, other PNG-supported providers) are options to investigate, not confirmed integrations. Extends DEC-010.

---

DEC-040 - Revised roadmap

Status: Approved

Decision

Phase 1 Foundation; Phase 2 General marketplace data model; Phase 3 Product marketplace; Phase 4 Services marketplace; Phase 5 Transactions and trust; Phase 6 Business development. Phases are built one after another, not simultaneously. See ROADMAP.md.

---

DEC-041 - Design before schema; each phase brings its own migrations

Status: Approved

Decision

Database changes are designed and reviewed before they are implemented. Future changes arrive through reviewed migrations, with access control and Row Level Security considered from the start. Extends DEC-024 and DEC-026.

---

DEC-042 - Architecture and repository name unchanged

Status: Approved

Decision

The technical architecture stays: Next.js 15, React, TypeScript, Supabase Auth, Supabase PostgreSQL, Prisma, Render, GitHub and Vitest. No paid services or paid APIs are assumed. The repository keeps the name png-materials-marketplace for now; a public brand can be decided separately.

---

DEC-043 - Conditions in Papua New Guinea are requirements

Status: Approved (as requirements), Proposed (specific designs)

Decision

Low bandwidth, Android phones and ordinary browsers, varied digital literacy, urban and remote use, simple listing creation, quotation-based pricing, practical contact methods, and fraud, privacy and complaints handling are design requirements. No provider is assumed to have a website, a business registration, online payments or accurate stock records.

Proposed: location by province and district plus a town or area name, with finer areas decided in Phase 2.

---

DEC-044 - Product listings and service listings are separate

Status: Proposed

Decision

Product listings and service listings are modelled as different things that share common ideas (category, provider, description, price information, last-updated date), because buyers need different information for each.

---

DEC-045 - Business development options are not decisions

Status: Approved (to defer), Proposed (options)

Decision

Optional provider subscriptions, featured listings, lead-generation fees, commissions and payment integrations are options to evaluate in Phase 6 once there is real use. None is decided.

---

# Decision added on 2026-10-21 (Phase 1 database status correction)

---

DEC-046 - Baseline Prisma's migration history before any migrate command

Status: Approved

Decision

The Phase 1 migration SQL (20261005000000_phase1_foundation) was applied manually to the live Supabase database. It is not yet recorded in Prisma's _prisma_migrations history. Until that history is reconciled, prisma migrate deploy, prisma migrate dev, prisma migrate reset and prisma db push must not be run against the existing live database.

Once the Prisma environment works and the live database has been safely checked (read-only commands first), the intended operation is:

npx prisma migrate resolve --applied 20261005000000_phase1_foundation

This records the migration as applied. It is not intended to run the migration SQL again. Afterwards, later migrations are applied with prisma migrate deploy, one reviewed migration at a time. Supersedes DEC-030. Extends DEC-026 and DEC-041.

Reason

Prisma cannot know about a migration applied by hand. Running migrate commands before the history is reconciled would fail on existing objects at best, and migrate dev, reset and db push can change or erase live data.

---

# Decisions added on 2026-10-25 (Phase 1 stabilisation)

Both decisions below are Proposed: they need the owner's approval.

---

DEC-047 - When the database fails after sign-in succeeds, end the session and answer 503

Status: Proposed

Decision

If Supabase accepts a sign-in or an e-mail confirmation but the application then fails because of a database error, the application signs the user out of Supabase and answers with a clear 503 (`DATABASE_UNAVAILABLE`), or sends the user to `/login?error=unavailable` from the confirmation link. Protected API routes answer 503 JSON for database or configuration failures instead of a bare 500. Programming errors are not hidden. The cause goes to the server log with credentials removed; it is never sent to the browser. Implemented in the stabilisation ZIP, not deployed.

Reason

Before this, a database failure left a live Supabase session cookie behind a generic 500, and the confirmation callback and API routes had no handling at all.

---

DEC-048 - Treat `migration.sql` as frozen once it may be recorded

Status: Proposed

Decision

Do not edit `prisma/migrations/20261005000000_phase1_foundation/migration.sql`, including its comments, until the live `_prisma_migrations` record has been read and its checksum compared with the file. Its stale status comment stays as a known contradiction; current status is recorded in the documentation. Extends DEC-046.

Reason

Prisma records a checksum of the migration file. If the live history already holds the checksum of the current file, any edit would make the repository differ from the record.

