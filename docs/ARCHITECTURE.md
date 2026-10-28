PNG Marketplace
(repository: png-materials-marketplace)

System Architecture

Version: 0.1.0 (Phase 1 - Foundation)
Last reconciled: 2026-10-21 (scope expansion; documentation only)

The project is planned as a general-purpose marketplace for goods and services in Papua New Guinea. Building materials remain an important first category. The technical architecture does not change.

This document has three parts.

- Part A describes what is implemented and tested in Phase 1. It is unchanged by the scope expansion.
- Part B keeps the earlier design written for the building-materials marketplace (supplier portal, catalogue, RFQs, quotations, orders). It is planned design only. None of it exists yet.
- Part C is new. It describes the proposed design for the expanded marketplace: accounts, provider profiles, products and services, trust, access control and low-bandwidth use. Part C is Proposed unless a statement says Approved. It is documentation only and does not authorise any code, schema or migration change.

---

# Part A - Implemented architecture (Phase 1)

## A1. Locked architecture

    GitHub (source control)
       |
       v
    Render Web Service
       |
       v
    Next.js application (one deployable app)
       |-- Frontend (React, App Router, mobile-first)
       |-- Backend (Route Handlers under /api and /auth)
       |
       v
    Supabase
       |-- Supabase Auth      (identities, passwords, sessions)
       |-- PostgreSQL         (application data, accessed through Prisma)
       |-- Supabase Storage   (future files; no bucket exists yet)

| Concern | Choice |
|---|---|
| Authentication | Supabase Auth (email and password) |
| Database | Supabase PostgreSQL |
| ORM | Prisma |
| File storage | Supabase Storage (foundation only) |
| Application hosting | Render |
| Source control | GitHub |
| Tests | Vitest |
| Lint | ESLint (eslint-config-next) |

There are no microservices and no native Android app. Vercel Hobby is not used for this business MVP (see DEC-018 in DECISIONS.md).

## A2. Why Supabase Auth, and why passwords are not in our tables

Password handling is easy to get wrong. Supabase Auth stores and verifies passwords, issues sessions, sends confirmation and recovery email, and rate-limits its own endpoints. The application therefore has **no password column, no password hash, no custom token signing and no second password system**. The `bcryptjs` and `jose` dependencies from the earlier design have been removed.

The application database stores only application data: who the user is inside the marketplace (role, name, phone, status) and their profile.

## A3. Identity link

    Supabase Auth user (UUID)  ==  users.id

`users.id` holds the Supabase Auth user UUID. It has no database default, because the id always comes from Supabase. There is deliberately **no foreign key** to the Supabase-managed `auth` schema: Prisma must not manage that schema. Email is a profile attribute, not the identity link.

## A4. Role authority

The authoritative role is `users.role` in the application database.

The role is never taken from the browser, a form, a query string, a request body or Supabase `user_metadata`. Registration accepts only CUSTOMER or SUPPLIER; ADMIN cannot be chosen (the request schema is strict, so a `role` field is a validation error). Admin is granted by a controlled manual step (docs/SETUP_SUPABASE.md).

`app_metadata.registration_type` is written only by trusted server code with the service-role key. It is used for one thing: rebuilding a profile whose creation failed (A6). It is never used to grant access and ADMIN can never be recovered from it.

## A5. Request authorization (defence in depth)

1. **Middleware** (`middleware.ts`) refreshes the Supabase session cookies and verifies the identity with `getUser()`. Signed-out requests to `/customer/*`, `/supplier/*` and `/admin/*` are redirected to `/login?next=...`. Middleware cannot query the database, so it does **not** decide roles.
2. **Server pages** call `requirePageRole()` and **API routes** call `requireApiAccess()` (`lib/auth/guards.ts`). These verify identity with `getUser()` (never `getSession()`), load the authoritative role and status from the database, and redirect (pages) or return 401/403 (APIs).
3. **No id in the URL.** `GET /api/users/me` takes no id; the user is always the verified identity.

CSRF: state-changing routes require a same-origin `Origin` header (or `Sec-Fetch-Site: same-origin`); requests with neither are rejected. Supabase cookies are SameSite=Lax.

Rate limiting: a small in-memory limiter protects register and login (see A9 for its limits).

## A6. Registration flow (Option A: server-side profile creation)

    Browser form -> POST /api/auth/register
      1. same-origin check, rate limit, strict validation (CUSTOMER or SUPPLIER only)
      2. supabase.auth.signUp()          Supabase owns the password; sends the confirmation email
      3. admin client writes app_metadata.registration_type (service-role key, server only)
      4. ensureProfile()                 idempotent, one transaction, keyed by the Supabase UUID
      5. audit log entry

- It never depends on `signUp()` returning a session, so it works with email confirmation turned on (no session until the link is clicked).
- If the email already exists, Supabase returns an obfuscated user with no identities; the route answers exactly as for a new sign-up, so the form cannot be used to discover registered emails.
- **Recovery (Option B safety net):** if step 4 fails, the Auth user still exists. On the next sign-in or when the confirmation link opens `/auth/callback`, `syncAppUser()` rebuilds the profile from the trusted hint. A user whose profile cannot be built is signed out and told setup is incomplete.
- `ensureProfile()` is idempotent: running it twice creates one user and one profile, and it never changes an existing role.

## A7. Row Level Security

Supabase exposes every table in the `public` schema through its REST API using the public anon key. The application does not use that path. It reaches PostgreSQL only through Prisma on a privileged server-side connection, which bypasses RLS.

    Browser / anon key  -> Supabase REST -> RLS enabled, no policies -> no rows, no writes
    Server (Prisma)     -> privileged connection -> application authorization (A5)

The migration enables RLS on all five Phase 1 tables, creates **no policies**, and revokes table privileges from the `anon` and `authenticated` roles. Do not add `USING (true)` policies. RLS is a safety net for the REST API; it does not replace server-side authorization.

## A8. Database connections

- `DATABASE_URL` - runtime, Supabase transaction pooler (port 6543, `?pgbouncer=true`).
- `DIRECT_URL` - migrations, direct connection (port 5432). On the free tier the direct host may be IPv6-only; if your network cannot reach it, use the Supabase session-pooler string instead.

Phase 1 tables: `users`, `customer_profiles`, `supplier_profiles`, `product_categories`, `audit_logs`. See DATABASE.md.

## A9. Rate limiting limits

The limiter is in memory. It counts only requests seen by one running instance, it resets when the Render instance restarts or redeploys, and several instances multiply the effective limit. It is a foundation, not distributed protection. Supabase Auth also rate-limits its own endpoints. A shared store can replace it later without changing callers.

## A10. Storage (foundation only)

No bucket is created in Phase 1. When uploads arrive (supplier logos, product images, verification documents):

- all access goes through server code; the browser never gets the service-role key;
- verification documents use a **private** bucket read through short-lived signed URLs;
- public product images and logos may use a public-read bucket, with write access only from the server;
- uploads are validated for size and type, and renamed safely (never trust the original file name);
- storage policies are written in the phase that adds uploads.

## A11. Environment variables

| Variable | Scope | Purpose |
|---|---|---|
| `DATABASE_URL` | server | Prisma runtime connection (pooled) |
| `DIRECT_URL` | server | Prisma migrations (direct or session pooler) |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret, server only** | writes `app_metadata.registration_type` at registration |
| `NEXT_PUBLIC_SITE_URL` | public; required on a hosted service behind a proxy | public address used for the e-mail confirmation redirects (the server's own request URL is an internal address behind Render) and for confirmation links when the request has no Origin |

Real values are never committed. `.env.example` holds names only.

## A12. Separation of public and privileged operations

| Public / client side | Privileged / server side only |
|---|---|
| Supabase URL and anon key | Prisma and `DATABASE_URL` / `DIRECT_URL` |
| Forms that call our own API | Service-role key and `lib/supabase/admin.ts` |
| Nothing else | Role and status decisions |

A test fails the build if a client component imports Prisma or the admin client.

## A13. Deployment (Render)

GitHub repository -> Render Web Service -> Next.js -> Supabase. Build command, start command, environment variables and the Supabase redirect URLs are in docs/SETUP_RENDER.md. **Deployment status is unconfirmed in the available evidence** (see REVIEW.md).

## A14. Phase 1 routes and APIs

| Route | Purpose |
|---|---|
| `/`, `/login`, `/register` | public pages |
| `/auth/callback` | email confirmation landing; profile sync |
| `/customer/dashboard` | CUSTOMER only |
| `/supplier/dashboard` | SUPPLIER only |
| `/admin/dashboard` | ADMIN only |
| `POST /api/auth/register`, `/login`, `/logout` | authentication |
| `GET /api/users/me` | the caller's own profile |
| `GET /api/admin/users` | ADMIN only; 50 most recent users, safe fields |

Password reset is handled by Supabase Auth. A reset page is a deliberate later deferral.

Known gaps: no Content-Security-Policy header yet (add before production), no password-reset UI, in-memory rate limiting only.

---

# Part B - Planned design for later phases (NOT implemented)

Everything below is earlier design that later phases will build on. Where it mentions passwords, sessions or hosting, Part A overrides it. These sections describe modules, routes, state machines and rules that do not exist yet.

Scope note: Part B was written for building materials only. Read "customer" as buyer and "supplier" as a provider who sells products. Where Part B and Part C differ on accounts, roles or provider concepts, Part C is the current proposal. The RFQ, quotation and order state machines in Part B remain the starting point for product transactions and will be extended for services.

3. Application Modules

Authentication
│
├── Registration
├── Login
├── Password reset
└── Sessions

Users
│
├── Customer
├── Supplier
└── Administrator

Marketplace
│
├── Categories
├── Products
├── Supplier listings
├── Prices
└── Stock

Projects
│
├── Projects
└── Materials lists

RFQ
│
├── RFQ creation
├── Supplier selection
├── Supplier responses
└── RFQ status

Quotations
│
├── Creation
├── Calculation
├── Comparison
└── PDF

Orders
│
├── Creation
├── Supplier confirmation
└── Status tracking

Administration
│
├── Users
├── Suppliers
├── Categories
├── Activity
└── Audit logs

---

4. Frontend Routes

Suggested route structure:

/
├── /login
├── /register
│
├── /marketplace
├── /products
├── /products/[id]
├── /suppliers
├── /suppliers/[id]
│
├── /customer
│   ├── /dashboard
│   ├── /projects
│   ├── /projects/[id]
│   ├── /rfqs
│   ├── /rfqs/[id]
│   ├── /quotations
│   ├── /quotations/[id]
│   ├── /orders
│   └── /orders/[id]
│
├── /supplier
│   ├── /dashboard
│   ├── /profile
│   ├── /products
│   ├── /products/new
│   ├── /products/[id]
│   ├── /rfqs
│   ├── /rfqs/[id]
│   ├── /quotations
│   ├── /quotations/[id]
│   ├── /orders
│   └── /orders/[id]
│
└── /admin
    ├── /dashboard
    ├── /users
    ├── /suppliers
    ├── /products
    ├── /categories
    ├── /rfqs
    ├── /quotations
    ├── /orders
    └── /audit-logs

---

5. API Structure

Suggested API groups:

/api/auth
/api/users
/api/suppliers
/api/categories
/api/products
/api/projects
/api/project-items
/api/rfqs
/api/quotations
/api/orders
/api/notifications
/api/admin

Examples:

GET    /api/products
GET    /api/products/:id
POST   /api/products
PATCH  /api/products/:id
DELETE /api/products/:id

RFQ:

GET    /api/rfqs
GET    /api/rfqs/:id
POST   /api/rfqs
PATCH  /api/rfqs/:id

Quotation:

GET    /api/quotations
GET    /api/quotations/:id
POST   /api/quotations
PATCH  /api/quotations/:id
GET    /api/quotations/:id/pdf

Orders:

GET    /api/orders
GET    /api/orders/:id
POST   /api/orders
PATCH  /api/orders/:id

---

6. Authorization Model

Every protected request must establish:

1. Who is the user?
2. What role does the user have?
3. Does that user own or have permission to access the requested resource?

Example:

A customer must not be able to modify another customer's RFQ.

A supplier must not be able to modify another supplier's products.

An ordinary customer must not access "/admin".

Authorization must happen on the server, not only in the frontend.

---

7. RFQ State Machine

Initial RFQ statuses:

DRAFT
   ↓
SENT
   ↓
OPEN
   ↓
QUOTATIONS_RECEIVED
   ↓
CLOSED

Alternative terminal states:

CANCELLED
EXPIRED

Supplier-specific RFQ status:

PENDING
VIEWED
RESPONDED
DECLINED
EXPIRED

---

8. Quotation State Machine

DRAFT
   ↓
SUBMITTED
   ↓
VIEWED
   ↓
ACCEPTED

Alternative:

DECLINED
EXPIRED
CANCELLED

A quotation should become immutable or version-controlled after acceptance.

---

9. Order State Machine

PENDING_CONFIRMATION
        ↓
CONFIRMED
        ↓
PREPARING
        ↓
READY_FOR_PICKUP
        ↓
COMPLETED

Delivery path:

CONFIRMED
    ↓
PREPARING
    ↓
OUT_FOR_DELIVERY
    ↓
DELIVERED
    ↓
COMPLETED

Alternative:

CANCELLED

---

10. Important Business Rules

Price

A supplier controls its own price.

The platform does not modify supplier prices.

Stock

Stock status is supplier-provided information.

The system displays the last update time.

Quotation

Supplier quotation prices override catalogue prices for that specific RFQ.

Example:

Catalogue price:

K40

Supplier responds to RFQ:

K38

The quotation uses:

K38

The catalogue remains:

K40

---

11. Project → RFQ Relationship

A customer may have:

Project
   │
   ├── Materials List
   │
   ├── RFQ #1
   │
   ├── RFQ #2
   │
   └── Order

This creates a project history.

---

12. Frontend Design Principles

The interface must be:

- Mobile-first
- Simple
- Fast
- Touch-friendly
- Low-bandwidth conscious
- Easy to understand
- Usable on Android phones
- Usable on desktop computers

Avoid excessive animations and unnecessary large media.

---

13. Supplier Dashboard

Primary dashboard:

Supplier Dashboard

Products
[ 125 ]

Pending RFQs
[ 8 ]

Quotations
[ 12 ]

Orders
[ 5 ]

--------------------

+ Add Product

View RFQs

View Orders

The most important actions should be immediately visible.

---

14. Customer Dashboard

My Dashboard

My Projects
My Materials Lists
My RFQs
My Quotations
My Orders

--------------------

[ Find Materials ]

[ Compare Suppliers ]

[ Create Materials List ]

---

15. Admin Dashboard

Administration

Users
Suppliers
Products
Categories
RFQs
Quotations
Orders
Audit Logs

Use tables with search and filters rather than unnecessarily complicated dashboards.

---

16. Search Architecture

Initial search can use PostgreSQL queries.

Search fields:

- Product name
- Brand
- Specification
- Category

Filters:

- Category
- Supplier
- Location
- Stock status
- Price range

Do not introduce Elasticsearch or another search engine in the MVP unless PostgreSQL becomes insufficient.

---

17. File Handling

Uploaded files must be:

- Validated
- Size limited
- Type checked
- Renamed safely
- Stored outside the application source directory where appropriate

Never trust the original filename.

---

18. Audit Logging

Important actions should be logged:

USER_REGISTERED
USER_LOGIN
SUPPLIER_CREATED
SUPPLIER_VERIFIED
PRODUCT_CREATED
PRODUCT_UPDATED
PRICE_UPDATED
RFQ_CREATED
RFQ_SENT
QUOTATION_CREATED
QUOTATION_SUBMITTED
QUOTATION_ACCEPTED
ORDER_CREATED
ORDER_STATUS_CHANGED

Audit records should include:

- User
- Action
- Resource
- Resource ID
- Timestamp
- Relevant metadata

---

19. Error Handling

The API must return consistent errors.

Example:

{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Product name is required."
  }
}

Frontend should display understandable messages rather than raw database errors.

---

23. Architecture Principle

Do not over-engineer the MVP.

Start with:

One application + one PostgreSQL database + one storage system.

Only split services when there is a demonstrated technical requirement.

This keeps development, deployment and maintenance manageable.

---

# Part C - Proposed architecture for the general goods-and-services marketplace

Status: Proposed, except where marked Approved. Nothing here is implemented. No schema, migration, authentication or application code changes are made by this document.

## C1. What stays the same

Approved: the technical architecture is retained.

| Concern | Choice |
|---|---|
| App | Next.js 15 (App Router), React, TypeScript |
| Authentication | Supabase Auth |
| Database | Supabase PostgreSQL |
| ORM | Prisma |
| Storage | Supabase Storage |
| Hosting | Render |
| Source control | GitHub |
| Tests | Vitest |

One Next.js application, no microservices, no paid services assumed. The repository keeps the name png-materials-marketplace for now; a public brand can be decided separately.

## C2. Accounts, capabilities and roles

Approved principle: one account system. A person does not need separate accounts to buy and to provide.

### Concepts

| Concept | What it is | Where it lives |
|---|---|---|
| User account | Identity, login, status | Supabase Auth plus the `users` row (Implemented) |
| Buyer capability | May search, request quotations, book, buy | Every active user (Proposed) |
| Provider profile | A shop, business or individual's public and business details | A new profile record owned by a user (Planned) |
| Provider type | Product seller, service provider, or both | A field on the provider profile (Planned) |
| Administrator | Platform management | `users.role = ADMIN` (Implemented) |

### Phase 1 stays as it is (Approved)

`users.role` (CUSTOMER, SUPPLIER, ADMIN) remains the authoritative role. The guards (`requirePageRole`, `requireApiAccess`), the identity-only middleware, the registration rules (no public ADMIN), the RLS setup, the five Phase 1 tables and the existing dashboard routes are not changed by the scope expansion.

### The problem the future model must solve

The current model gives each user one role. A plumber who also buys materials, or a hardware store that also offers installation, needs to act as buyer and provider at once, without a second account.

### Options considered (Proposed)

| Option | Idea | Assessment |
|---|---|---|
| A (recommended) | Keep `users.role` as the platform privilege. Derive provider capability from owning a provider profile, checked in the database on the server. | Simple, hard to spoof, fits the existing guards. Needs a decision on what happens to the SUPPLIER value. |
| B | A `user_roles` table that gives a user several roles. | Flexible, but more moving parts, and a role claim must still be tied to a profile. Consider only if staff and team roles become necessary. |
| C | Add combined enum values such as BUYER_AND_PROVIDER. | Rejected. It multiplies as capabilities grow. |

### Recommended direction under Option A

- Every active user is a buyer.
- A user becomes a provider by creating a provider profile. Creating a profile does not raise their platform privilege.
- Whether a provider is shown publicly depends on the profile's status, which only an administrator can change.
- Each provider action loads the user's profile in the database and checks it belongs to them and is not suspended.
- Each resource (listing, quotation, booking, order) is checked against the provider profile or the buyer who owns it, on every request.
- ADMIN stays a platform-level privilege stored in the database and is never selectable at public registration.

Server-side check order for any protected request: who is the user (`getUser()`); load the application user and status; is an admin action allowed; for provider actions, load the owned provider profile and check its status; check the resource owner. Never read a role or capability from `user_metadata` or from the request.

### Decisions needed in Phase 2 (explicit approval required before implementing)

- Whether to retire the SUPPLIER role value, keep it as a legacy marker, or migrate existing supplier accounts.
- Whether one user may own one provider profile or several (for example an individual who also runs a business).
- Whether a business needs staff accounts that act for it (not needed for the first release).
- Whether `supplier_profiles` is generalised into a provider profile, or a new table is added alongside it.
- Names and routes for the buyer and provider areas. The current routes (`/customer/*`, `/supplier/*`, `/admin/*`) stay until then.
- Changes to the guards and to the audit actions.
- How the existing registration choice (Customer or Supplier) is presented once providers can be of three types.

### Risks to design against

- A self-service provider profile must not become a path to higher privilege or to appearing verified.
- A buyer-and-provider must not be able to act on a transaction as both sides (for example accepting their own quotation). The server must prevent it.

## C3. Provider profiles

Provider kinds: business, or individual. Provider types: product seller, service provider, or both. These are separate fields.

Candidate fields (to be finalised in Phase 2): display name, kind, type, description, phone, email, address, province, district, town or area, service areas, optional business registration details, logo or photo, delivery and pickup availability for product sellers, working hours or availability for service providers, and status.

Status and verification are separate. A profile can be active but not verified.

Optional by design: website, business registration number, online payment details. Nothing here assumes a provider has them.

## C4. Listings and prices

Product listings and service listings are kept as different things (Proposed). They share ideas (category, provider, description, price information, last updated) but differ in what a buyer needs: stock and unit for a product, service area and availability for a service.

| Price kind | Applies to | Set by | Notes |
|---|---|---|---|
| Catalogue price | Product listing | Provider | Shown with last-updated date. Not a guarantee of stock. |
| Indicative rate | Service listing | Provider | A guide such as "from K__ per hour", not a promise. |
| Quotation price | A specific request | Provider | Valid until a stated date. Kept separate from the catalogue price. |
| Agreed price | Order or booking | Recorded at acceptance | Never changed by later price updates (extends DEC-009). |

The platform never presents an estimated or AI-generated figure as a provider's price.

## C5. Transaction flows

The platform facilitates; it is neither seller nor employer. Initial payment is arranged directly between buyer and provider.

Product flow: browse or search, compare supplier prices, enquire or request a quotation (RFQ), receive quotation, accept, order, status updates. This builds on the state machines in Part B.

Service flow: search by category and location, view provider, send a service request, receive quotation or confirm the indicative rate, accept, booking, job completed, review.

Candidate booking statuses (Proposed, to be finalised when bookings are designed): Requested, Quoted, Accepted, Scheduled, In progress, Completed, Cancelled, Disputed. Every transaction has an explicit status history, and important details (agreed price, scope, date) are preserved.

Notifications: in-app and email first. SMS, push and WhatsApp are options to evaluate later.

## C6. Search and location

Start with PostgreSQL queries and indexes. Do not add an external search engine unless PostgreSQL proves insufficient (extends the guidance in Part B).

- Products: name, brand, specification, category, provider, location, stock status, price range.
- Services: category, location, service area, provider type, availability.
- Location: province and district, plus a town or area name (Proposed). A finer local-level area is a Phase 2 decision.
- Results must show the provider's last-updated date and verification status honestly.

## C7. Trust, safety and moderation

- Verification labels say exactly what was checked, and are used only after the defined check has been done (extends DEC-014).
- Reviews tied to completed transactions, complaints, and administrator moderation and dispute handling (Phase 5).
- Private contact details are revealed only under rules set during design.
- Rate limiting and audit logging cover listings, enquiries, reviews and verification actions.
- Administrators can suspend a listing or provider. Those actions are audit-logged.

## C8. Access control and Row Level Security for future tables

- Every new table is created in a reviewed migration with Row Level Security enabled and no permissive public policies, as in Phase 1 (extends DEC-024 and DEC-026).
- Public pages read listings through server-side code. The public Supabase API is not used to read marketplace tables.
- Access rules and RLS are reviewed in Phase 2 before any table is implemented, then re-checked on the live database after each migration.
- Storage buckets and their access policies are designed in the phase that introduces uploads.

## C9. Low bandwidth and device conditions

- Server-rendered pages, small payloads, pagination, compressed images with size limits, no heavy external fonts or scripts.
- Works on ordinary Android browsers; PWA features only where they help and do not complicate the app.
- Simple forms with few required fields; easy price and availability updates.
- Listings show when information was last updated.
- Interface language: English first. Tok Pisin and Hiri Motu text is an option to consider later (not a decision).
- Free and low-cost tiers of Supabase and Render have limits on database size, storage, email and sleeping services. Review capacity before a public launch.

## C10. Storage

Extends A10. Public listing images and logos may use a public-read bucket with writes only from server code. Identity and business verification documents use a private bucket read through short-lived signed URLs and are visible only to the owner and administrators. No buckets exist yet.

## C11. Candidate data entities (design candidates, not a list of tables to create)

| Entity | Purpose | Likely phase |
|---|---|---|
| Provider profile (business or individual) | Public and business details of a provider | 2 (design) |
| Provider verification record | What was checked, by whom, when | 2 |
| Locations (province, district) | Search and service areas | 2 |
| Service categories | Organise services | 2 and 4 |
| Product categories (exists) | Extended beyond building materials | 3 |
| Product listings, provider prices, price history | Product marketplace | 3 |
| Service listings, service areas, availability | Services marketplace | 4 |
| Enquiries or conversations | Buyer and provider contact | 4 and 5 |
| Quotations | Priced offers | 5 |
| Orders and bookings | Agreed transactions with status history | 5 |
| Reviews and complaints | Trust | 5 |
| Notifications | Alerts | 5 |
| Subscriptions, featured listings | Business development, if viable | 6 |

Phase 1 already provides `users`, `customer_profiles`, `supplier_profiles`, `product_categories` and `audit_logs`. Future tables are introduced through reviewed migrations, each with access controls and RLS considered from the start.

## C12. Open questions

1. How should existing CUSTOMER and SUPPLIER accounts map onto the buyer and provider model?
2. One provider profile per user, or several?
3. Is there a business-with-staff requirement in the first release?
4. What verification levels are practical to operate in Papua New Guinea?
5. Which payment approaches are workable and legal, and when to evaluate them?
6. How are disputes between buyer and provider handled in practice?
