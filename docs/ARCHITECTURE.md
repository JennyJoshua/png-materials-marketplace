PNG Materials Marketplace

System Architecture

Version: 0.1.0 (Phase 1 - Foundation)
Last reconciled: 2026-10-05

This document has two parts.

- Part A describes what is implemented and tested in Phase 1.
- Part B keeps the earlier design for later phases (supplier portal, catalogue, RFQs, quotations, orders). It is planned design only. None of it exists yet.

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
| `NEXT_PUBLIC_SITE_URL` | public, optional | base URL for confirmation links if the request has no Origin |

Real values are never committed. `.env.example` holds names only.

## A12. Separation of public and privileged operations

| Public / client side | Privileged / server side only |
|---|---|
| Supabase URL and anon key | Prisma and `DATABASE_URL` / `DIRECT_URL` |
| Forms that call our own API | Service-role key and `lib/supabase/admin.ts` |
| Nothing else | Role and status decisions |

A test fails the build if a client component imports Prisma or the admin client.

## A13. Deployment (Render)

GitHub repository -> Render Web Service -> Next.js -> Supabase. Build command, start command, environment variables and the Supabase redirect URLs are in docs/SETUP_RENDER.md. **Deployment has not been performed.**

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
