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

Use PostgreSQL as the primary database.

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
