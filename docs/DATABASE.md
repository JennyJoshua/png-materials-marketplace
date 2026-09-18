PNG Materials Marketplace

Database Specification

Version: 0.1
Database: PostgreSQL
ORM: Prisma recommended

---

1. Database Principles

The database must:

- Use UUIDs or another secure non-sequential identifier strategy where appropriate.
- Use foreign keys.
- Use timestamps.
- Use constraints.
- Avoid duplicated data where possible.
- Preserve important historical records.
- Support future marketplace expansion.

All tables should include appropriate creation/update timestamps.

---

2. users

Stores authentication and basic user information.

users
-----
id
role
full_name
email
phone
password_hash
status
created_at
updated_at
last_login_at

role

CUSTOMER
SUPPLIER
ADMIN

status

ACTIVE
PENDING
SUSPENDED

Email should be unique where email authentication is used.

Phone may also be unique if phone authentication is implemented.

---

3. customer_profiles

Additional customer information.

customer_profiles
-----------------
id
user_id
address
location
created_at
updated_at

Relationship:

users 1 ─── 1 customer_profiles

---

4. supplier_profiles

Supplier business information.

supplier_profiles
-----------------
id
user_id
business_name
business_description
business_address
location
phone
email
logo_url
verification_status
delivery_available
pickup_available
created_at
updated_at

Verification status:

PENDING
VERIFIED
SUSPENDED

Relationship:

users 1 ─── 1 supplier_profiles

---

5. product_categories

product_categories
------------------
id
name
description
status
created_at
updated_at

Status:

ACTIVE
INACTIVE

---

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

19. audit_logs

audit_logs
----------
id
user_id
action
resource_type
resource_id
metadata
ip_address
user_agent
created_at

Do not store passwords or sensitive authentication secrets in audit logs.

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

---

27. Initial Migration Order

Create tables approximately in this order:

1. users
2. customer_profiles
3. supplier_profiles
4. product_categories
5. products
6. supplier_products
7. price_history
8. projects
9. project_items
10. rfqs
11. rfq_items
12. rfq_suppliers
13. quotations
14. quotation_items
15. orders
16. order_items
17. notifications
18. audit_logs

---

28. Seed Data

Development database should include initial categories:

Cement & Concrete
Steel & Reinforcement
Timber
Roofing
Plumbing
Electrical
Paint
Building Boards
Doors & Windows
Fencing
Water & Tanks
Tools
Safety Equipment
General Hardware
Other

Seed data must be clearly identifiable as development/test data and must not be presented as real supplier information.
