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

Decision

The Phase 1 migration is generated but not applied. The project owner applies it with prisma migrate deploy once the Supabase project exists.
