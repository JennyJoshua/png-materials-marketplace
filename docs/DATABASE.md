PNG Materials Marketplace

Database Specification

Version: 0.1.0 (Phase 1 - Foundation)
Last reconciled: 2026-10-05
Database: Supabase PostgreSQL, accessed through Prisma

Part A documents the five tables that exist in Phase 1. Part B keeps the design of later-phase tables. **Part B tables do not exist yet.**

---

# Part A - Phase 1 tables (implemented)

Source of truth: `prisma/schema.prisma` and `prisma/migrations/20261005000000_phase1_foundation/migration.sql`.

## A1. Principles

- UUID identifiers; timestamps (`timestamptz`) on every table; foreign keys; indexes on lookup columns.
- Authentication data lives in Supabase Auth, not here: **no password, hash or token columns**.
- Money columns (later phases) use exact `numeric/decimal`, never floating point. Default currency PGK. No Phase 1 table holds money.
- Each development phase adds its own tables and its own migration.

## A2. Identity link and the Supabase `auth` schema

`users.id` is the Supabase Auth user UUID, supplied by the application (no database default). There is **no foreign key** to the `auth` schema, and Prisma does not manage it. Email is stored lowercase (CHECK constraint) and is unique, but identity is the UUID.

## A3. Tables

### users
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | = Supabase Auth user UUID, no default |
| role | enum UserRole | CUSTOMER, SUPPLIER, ADMIN; default CUSTOMER; **authoritative role** |
| full_name | text | |
| email | text, unique | lowercase enforced by CHECK |
| phone | text, null | |
| status | enum UserStatus | ACTIVE, PENDING, SUSPENDED; default PENDING |
| created_at, updated_at | timestamptz | |
| last_login_at | timestamptz, null | |

Indexes: unique(email), role, status.

### customer_profiles
id (uuid PK), user_id (uuid, **unique**, FK users ON DELETE CASCADE), address (null), location (null), created_at, updated_at. One per CUSTOMER.

### supplier_profiles
id, user_id (unique, FK users ON DELETE CASCADE), business_name, business_description (null), business_address, location, phone (null), email (null), logo_url (null), verification_status (enum PENDING, VERIFIED, SUSPENDED; default **PENDING**), delivery_available (default false), pickup_available (default true), created_at, updated_at. One per SUPPLIER. Indexes: verification_status, location, business_name.

### product_categories
id, name (**unique**), description (null), status (enum ACTIVE, INACTIVE; default ACTIVE), created_at, updated_at. Seeded with 15 categories.

### audit_logs
id, user_id (null, FK users ON DELETE SET NULL), action, resource_type (null), resource_id (null), metadata (jsonb, null), ip_address (null), user_agent (null), created_at. Indexes: user_id, action, created_at. Metadata never holds passwords, tokens or secrets (a sanitiser drops credential-looking keys).

Actions written in Phase 1: USER_REGISTERED, USER_LOGIN, USER_LOGIN_FAILED, USER_LOGOUT, PROFILE_CREATE_FAILED, PROFILE_RECOVERED.

## A4. Row Level Security

RLS is **enabled on all five tables**. No policies exist, so the Supabase REST API (anon / authenticated roles) can read and write nothing. Table privileges are also revoked from those roles. Prisma uses a privileged connection that bypasses RLS; application code enforces authorization (ARCHITECTURE.md A5, A7). Never add `USING (true)` policies.

## A5. Migration strategy and status

- Connections: `DATABASE_URL` (pooled, port 6543, `?pgbouncer=true`) for runtime; `DIRECT_URL` (direct 5432 or session pooler) for migrations. The direct host may be IPv6-only on the free tier.
- One migration exists: `20261005000000_phase1_foundation`.
- **Status: GENERATED BUT UNAPPLIED to Supabase.** No Supabase credentials were available. Apply with `npx prisma migrate deploy` (see SETUP_SUPABASE.md).
- The migration SQL was written by hand because the Prisma schema engine could not be downloaded in the authoring environment, so `prisma migrate diff` was not used. It was instead applied to a real PostgreSQL 16 and compared against Prisma's data model. Details are in REVIEW.md. Before first use you can re-check with `prisma migrate diff` (command in the migration header).
- Later phases add their own tables and migrations:

  products, supplier_products, price_history, projects, project_items, rfqs, rfq_items, rfq_suppliers, quotations, quotation_items, orders, order_items, notifications.

## A6. Seed

`npm run db:seed` upserts the 15 categories by name (idempotent): Cement & Concrete, Steel & Reinforcement, Timber, Roofing, Plumbing, Electrical, Paint, Building Boards, Doors & Windows, Fencing, Water & Tanks, Tools, Safety Equipment, General Hardware, Other. It creates no users, suppliers, customers, passwords or admin accounts. **The seed has not been run** (no database was available).

---

# Part B - Planned tables and rules for later phases (NOT created)

Earlier design, kept for later phases. Where anything here differs from Part A, Part A wins. These tables do not exist in the database.

6. products

Represents a marketplace product definition.

products
--------
id
category_id
name
description
brand
specification
unit
status
created_at
updated_at

Status:

ACTIVE
INACTIVE

Important:

A product does not contain the supplier's price.

---

7. supplier_products

Represents a supplier's listing of a product.

supplier_products
-----------------
id
supplier_id
product_id
supplier_sku
price
currency
stock_status
last_price_update
last_stock_update
description
created_at
updated_at

Stock:

IN_STOCK
LIMITED_STOCK
OUT_OF_STOCK
CONTACT_SUPPLIER

Relationship:

supplier_profiles
        │
        └── supplier_products
                    │
                    └── products

Recommended unique constraint:

supplier_id + product_id

unless the business later requires multiple listings of the same product.

---

8. price_history

Preserves historical supplier pricing.

price_history
-------------
id
supplier_product_id
price
currency
recorded_at

Every supplier price change may create a new history record.

This is important for future price-trend functionality.

---

9. projects

projects
--------
id
customer_id
name
description
location
status
created_at
updated_at

Status:

ACTIVE
COMPLETED
ARCHIVED

---

10. project_items

Materials required by a project.

project_items
------------
id
project_id
product_id
description
quantity
unit
notes
created_at
updated_at

"product_id" may be nullable.

This allows a customer to enter:

"Steel posts 2.1m"

before identifying a specific marketplace product.

---

11. rfqs

Request for quotation header.

rfqs
----
id
customer_id
project_id
rfq_number
request_date
required_date
delivery_location
fulfilment_method
notes
status
created_at
updated_at

Fulfilment method:

PICKUP
DELIVERY
EITHER

Status:

DRAFT
SENT
OPEN
QUOTATIONS_RECEIVED
CLOSED
CANCELLED
EXPIRED

---

12. rfq_items

Materials requested in an RFQ.

rfq_items
---------
id
rfq_id
product_id
description
quantity
unit
notes
created_at

This is separate from "project_items" because the customer may modify the requested list for a particular RFQ.

---

13. rfq_suppliers

Suppliers selected by the customer.

rfq_suppliers
-------------
id
rfq_id
supplier_id
status
sent_at
viewed_at
responded_at
created_at

Status:

PENDING
VIEWED
RESPONDED
DECLINED
EXPIRED

Recommended unique constraint:

rfq_id + supplier_id

---

14. quotations

Quotation header.

quotations
----------
id
rfq_id
supplier_id
quotation_number
quotation_date
valid_until
subtotal
discount
delivery_fee
other_charges
total
currency
status
notes
terms
created_at
updated_at

Status:

DRAFT
SUBMITTED
VIEWED
ACCEPTED
DECLINED
EXPIRED
CANCELLED

---

15. quotation_items

quotation_items
---------------
id
quotation_id
product_id
description
quantity
unit
unit_price
line_total
notes
created_at

"product_id" may be nullable.

This is important because a supplier may quote a requested item even if it doesn't exactly correspond to a marketplace product.

---

16. orders

orders
------
id
order_number
customer_id
supplier_id
quotation_id
order_date
status
subtotal
discount
delivery_fee
other_charges
total
currency
delivery_location
fulfilment_method
notes
created_at
updated_at

Status:

PENDING_CONFIRMATION
CONFIRMED
PREPARING
READY_FOR_PICKUP
OUT_FOR_DELIVERY
DELIVERED
COMPLETED
CANCELLED

---

17. order_items

order_items
-----------
id
order_id
product_id
description
quantity
unit
unit_price
line_total
created_at

Order items should represent the agreed transaction at the time of ordering.

They should not dynamically change when a supplier later changes their catalogue price.

---

18. notifications

notifications
-------------
id
user_id
type
title
message
related_resource_type
related_resource_id
read_at
created_at

Example:

type:
NEW_RFQ

related_resource_type:
RFQ

related_resource_id:
<RFQ ID>

---

20. Entity Relationship Overview

USERS
 │
 ├───────────────┐
 │               │
 ▼               ▼
CUSTOMERS     SUPPLIERS
 │               │
 │               └──── SUPPLIER_PRODUCTS
 │                            │
 │                            ▼
 │                         PRODUCTS
 │                            │
 │                       CATEGORIES
 │
 └── PROJECTS
       │
       └── PROJECT_ITEMS
               │
               ▼
             RFQs
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
 RFQ_SUPPLIERS       RFQ_ITEMS
       │
       ▼
 QUOTATIONS
       │
       ▼
 QUOTATION_ITEMS
       │
       ▼
 ORDERS
       │
       ▼
 ORDER_ITEMS

---

21. Important Relationships

User → Supplier

One user can own/manage one supplier profile in MVP.

Future versions may support multiple staff accounts per supplier.

Supplier → Products

One supplier can list many products.

Product → Category

Each product belongs to one primary category.

Customer → Projects

One customer can have many projects.

Project → Project Items

One project can contain many items.

RFQ → Suppliers

One RFQ can be sent to multiple suppliers.

RFQ → Quotations

A supplier may submit one quotation for an RFQ in MVP.

Quotation → Order

One accepted quotation creates one order.

---

22. Data Integrity Rules

The database must enforce:

- Required fields
- Valid foreign keys
- Unique RFQ numbers
- Unique quotation numbers
- Unique order numbers
- Positive quantities
- Non-negative prices
- Valid status values
- Valid dates

Money values must use a suitable exact numeric/decimal type rather than floating-point numbers.

---

23. Currency

MVP default:

PGK

Database should still include a currency field so multiple currencies can theoretically be supported later.

---

24. Money Calculation

Never rely solely on values supplied by the browser.

The server must calculate:

line_total = quantity × unit_price

subtotal = sum(line_total)

total =
subtotal
- discount
+ delivery_fee
+ other_charges

The server must validate all calculations before saving.

---

25. Historical Transaction Data

Once a quotation is accepted and converted into an order:

The order must preserve:

- Product description
- Quantity
- Unit
- Agreed unit price
- Line total
- Discount
- Delivery fee
- Other charges
- Total

A later catalogue price change must not modify an existing order.

---

26. Future Database Expansion

The architecture should eventually support:

supplier_staff
customer_addresses
product_images
product_variants
stock_quantities
reviews
ratings
payments
deliveries
transport_providers
price_alerts
price_history
ai_project_estimates
shopping_carts
multi_supplier_orders

These should NOT be added to the MVP unless required.
