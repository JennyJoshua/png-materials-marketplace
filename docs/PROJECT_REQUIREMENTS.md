PNG Marketplace
(repository: png-materials-marketplace)

Project Requirements

Version: 0.2
Status: MVP development specification (scope expanded 2026-10-21; documentation change only)
Target Market: Papua New Guinea
Product Type: Mobile-first Web Application / PWA

How to read this document

Every capability is tagged by status:

- Implemented: exists in the repository and was tested as recorded in docs/REVIEW.md. Only Phase 1 qualifies.
- Planned: the agreed direction. Not built yet.
- Proposed: a recommendation that has not been approved. It may change.
- Future: deliberately left for later.

Scope-change note (2026-10-21): the project began as "PNG Materials Marketplace", a marketplace for building materials. It is now planned as a general-purpose marketplace for goods and services in Papua New Guinea. Building materials remain an important first category. This change is documentation only: no application code, database schema, migration, dependency, authentication logic or GitHub Actions workflow was changed.

Phase 1 reality: only Phase 1 (Foundation) is implemented: registration, login, logout, three role dashboards and the database foundation (five tables). Everything else in this document is planned. Authentication is handled by Supabase Auth: the application never stores or hashes passwords. The architecture is GitHub, Render, Next.js, Supabase (Auth, PostgreSQL, Storage) with Prisma as the ORM. See ARCHITECTURE.md, DECISIONS.md and ROADMAP.md. Phase 1 is recorded as PARTIALLY COMPLETE in REVIEW.md; its outstanding validation and deployment work is listed in ROADMAP.md.

This document has two parts.

- Part 1 describes the expanded purpose, the account model, the planned marketplace functions, the transaction approach and the conditions specific to Papua New Guinea.
- Part 2 keeps the detailed requirements written for the original building-materials marketplace (products, pricing, RFQs, quotations, orders, notifications, admin). They still apply to the product side of the marketplace. Their sections are numbered P5 to P22 so that old references remain traceable.

---

# Part 1 - Purpose, scope and model

1. Project Purpose

The platform connects people and organisations across Papua New Guinea who want to buy goods or pay for services with providers who can supply them.

The original building-materials marketplace remains an important use case. It is now one category within a wider marketplace.

The platform facilitates transactions. It is not the seller of every product and not the employer of every service provider.

---

2. Who the Platform Serves

2.1 Buyers

Buyers can be individuals, households, businesses, schools, churches, government institutions, NGOs and other organisations that purchase goods or pay for services.

2.2 Providers

The platform supports three types of provider.

Product businesses

Hardware stores, supermarkets, wholesalers, retailers, agricultural suppliers, clothing shops, electronics shops and other businesses that sell physical goods.

Individual service providers

Mechanics, electricians, plumbers, cleaners, carpenters, builders, gardeners, tutors, photographers, repairers and other professionals who offer their skills or time.

Businesses offering goods and services

Businesses that sell products and also provide services, for example an equipment supplier that offers installation or repair.

2.3 Administrators

Authorised platform staff who manage users, providers, categories, listings, complaints and reports.

---

3. Core Product Principles

3.1 Provider-provided versus platform-generated information

The system must distinguish between:

Provider-provided information

- Product or service name and description
- Price, indicative rate or quotation
- Stock status or availability
- Delivery fee or service area
- Terms and conditions of the provider

and:

Platform-generated information

- Search results and price comparisons
- Enquiry, quotation, order and booking numbers
- Quotation PDFs (planned)
- Notifications
- Status tracking
- Verification status (only as defined in section 8)

The platform must never present an estimated or AI-generated price as an actual provider price.

3.2 The platform facilitates

Providers control their own prices and availability. The platform records agreed prices and important transaction details. It does not guarantee stock, quality of work or payment.

3.3 Do not assume

Do not assume that every provider has a website, a business registration, an online payment facility, a sophisticated inventory system or accurate real-time stock records.

---

4. Account and Role Model

4.1 One account system

The platform is built around a single account system. A person must not need separate accounts to buy goods and to operate a business or offer services.

4.2 Concepts

These concepts are kept separate:

| Concept | Meaning | Status |
|---|---|---|
| User account | Identity, login and account status. Supabase Auth holds the credentials; the application `users` table holds the application profile. | Implemented (Phase 1) |
| Buyer capability | The ability to search, request quotations, book services and purchase goods. | Planned. In Phase 1 the CUSTOMER role is the closest thing. |
| Provider profile | Information about a shop, business or individual service provider. | Phase 1 has `supplier_profiles` for suppliers only. A general provider profile is Planned (Phase 2 design). |
| Provider type | Product seller, service provider, or combined goods-and-services provider. | Planned |
| Administrator | Authorised platform management. | Implemented as the ADMIN role (Phase 1) |

4.3 What exists today (Phase 1)

`users.role` is CUSTOMER, SUPPLIER or ADMIN. The database profile is the authoritative role and is never taken from the browser or from Supabase `user_metadata`. Public registration offers only CUSTOMER and SUPPLIER. ADMIN is granted by a controlled manual step. Every protected page and API route re-checks identity and role on the server.

4.4 What must stay unchanged in Phase 1

- The meaning and values of `users.role`.
- The registration rules (no public ADMIN).
- The server-side guards, the middleware behaviour and the Row Level Security setup.
- The five Phase 1 tables and the existing routes.

Phase 1 is not to be redesigned for the expanded scope.

4.5 Proposed future model (needs explicit approval before any implementation)

Users who act as both buyers and providers must be supported without weakening server-side permission checks. The recommended direction, described in ARCHITECTURE.md Part C, is:

- every active user is a buyer;
- provider capability comes from owning a provider profile, looked up in the database on the server, not from a second role claim;
- ADMIN remains a platform-level privilege stored in the database;
- ownership of each resource (profile, listing, quotation, booking) is checked on every request.

How to move from the current CUSTOMER and SUPPLIER roles to this model is a decision for Phase 2. It is not part of this documentation change.

---

5. Planned Marketplace Functions

All of the following are Planned. None exists yet. ROADMAP.md says when each is intended to arrive.

5.1 Public marketplace

- Browse and search products.
- Compare supplier-provided prices.
- Browse businesses and individual professionals.
- Search for services by category and location.
- View provider profiles, service areas, prices or indicative rates, availability and verification status.
- Submit enquiries or quotation requests.

5.2 Buyer portal

- Buyer dashboard and profile.
- Product enquiries and quotation requests.
- Service requests and bookings.
- Received quotations.
- Orders and booking status.
- Reviews and complaints.
- Account settings.

5.3 Provider portal

- Business or professional profile.
- Product listings, where applicable.
- Service listings, where applicable.
- Provider-controlled prices and availability.
- Product stock status, where applicable.
- Quotation management.
- Order management.
- Service requests and bookings.
- Customer reviews.
- Basic activity reports.

5.4 Administrator portal

- User and provider management.
- Provider verification.
- Product and service category management.
- Listing moderation.
- Complaint and dispute handling.
- Review moderation.
- Platform activity reporting.

---

6. Transaction Approach

For the first releases:

- Providers control their own prices and availability.
- Product prices must be distinguishable from quotation-specific prices.
- Service providers can publish indicative rates or quote for individual jobs.
- Buyers can request quotations before committing.
- Orders and bookings must have clear statuses.
- The platform preserves agreed prices and important transaction details.
- Initial transactions may be arranged directly between buyer and provider, with the platform recording relevant statuses where appropriate.
- Online payment processing is deferred until a suitable approach has been evaluated for Papua New Guinea.

6.1 Kinds of price

| Kind | Used for | Who sets it |
|---|---|---|
| Catalogue price | A product listing | Provider |
| Indicative rate | A service listing ("from K__ per hour or job"). Not a promise. | Provider |
| Quotation price | A specific request. Valid until a stated date. | Provider |
| Agreed price | The price accepted by the buyer. Preserved on the order or booking and never changed by later price updates. | Recorded by the platform |

6.2 Payments

Initially the buyer and provider arrange payment directly. The platform does not process customer funds.

Possible payment methods to investigate later (none is a confirmed integration): bank transfer, mobile money, card and other payment providers supported in Papua New Guinea.

---

7. Conditions in Papua New Guinea

The requirements must take account of:

- Mobile-first access and low-bandwidth connections.
- Android phones and ordinary web browsers.
- Different levels of digital literacy.
- Urban, rural and remote communities.
- Province, district, town and service-area information.
- Providers who may not have sophisticated inventory systems.
- Simple listing creation and easy price updates.
- Quotation-based transactions when prices or availability vary.
- Practical ways to contact providers.
- Fraud prevention, privacy, complaints and provider verification.

Practical consequences (Planned design requirements):

- Pages and images should stay small; avoid heavy external assets.
- A listing must be creatable with a few fields. Optional details must be optional.
- Stock and availability are shown with the date they were last updated, and are never presented as real-time.
- A provider without a website, a business registration number or online payment must still be able to take part. Optional business registration information is collected where the provider has it.
- Location uses province and district, and a town or area name. Whether to add finer local-level areas is a Phase 2 decision (Proposed).
- Contact by phone is a first-class method. Other channels are options to evaluate.

---

8. Trust, Safety and Verification

8.1 Verification

A provider is shown as "verified" only if the platform has actually completed the verification process defined for that label. Until a process is defined and applied, no provider may be labelled verified. A provider's status (for example pending or suspended) must be shown honestly.

Proposed (to be decided in Phase 2): separate levels, for example contact details confirmed, and identity or business documents checked by an administrator, each with its own label that says exactly what was checked.

8.2 Complaints, reviews and disputes (Planned, Phase 5)

- Buyers can raise complaints and leave reviews.
- Reviews should be tied to a completed transaction, to reduce fake reviews (Proposed).
- Administrators moderate reviews and handle complaints and disputes.

8.3 Privacy and fraud

- Private details (phone, email, address) are shown only when the design says they should be, and never to people who have no relationship with the provider or buyer (Proposed rules to be set in Phase 2 and 4).
- Rate limiting, audit logging and moderation tools apply to listings, enquiries and reviews.
- Listings can be reported and suspended by administrators.

---

9. Authentication and Security Requirements

9.1 Authentication (Implemented in Phase 1)

- Registration, login and logout.
- Password storage and hashing handled by Supabase Auth (never by the application).
- Password reset handled by Supabase Auth (reset page planned for a later phase).
- Session management through Supabase Auth cookies.
- Role-based authorization (authoritative role stored in the application database).

A user must only access functions permitted for their role.

9.2 Security requirements

The application must implement:

- Passwords handled only by Supabase Auth; never stored by the application
- Secure authentication
- Server-side authorization
- Role-based access control
- Input validation
- SQL injection protection
- XSS protection
- CSRF protection where applicable
- Secure session handling
- Rate limiting for sensitive endpoints
- Secure file upload handling
- Audit logging
- Environment variables for secrets
- No API keys committed to GitHub

Users must never be able to access another user's private data simply by changing an ID in a URL or API request.

Additional requirements for the expanded marketplace (Planned):

- Every new table is created with Row Level Security enabled and no permissive public policies. Access rules are reviewed before the table is used.
- Public pages read listings through server-side code, not through open database access.
- Ownership of every provider resource is checked on the server on every request.
- Verification, suspension and moderation actions are administrator-only and are audit-logged.

---

10. Categories

10.1 Product categories (seed script implemented in Phase 1)

The seed script exists in the repository and ran successfully on the live Supabase database (reported 2026-10-21): exactly 15 product categories exist and all are ACTIVE (see REVIEW.md). The 15 building-materials categories are the initial seed: Cement & Concrete, Steel & Reinforcement, Timber, Roofing, Plumbing, Electrical, Paint, Building Boards, Doors & Windows, Fencing, Water & Tanks, Tools, Safety Equipment, General Hardware, Other.

Categories for other goods (for example groceries, clothing, electronics, agriculture) are Planned for the product marketplace phase. Administrators manage categories.

10.2 Service categories (Proposed)

Service categories do not exist yet. The final list is decided in the design phase and managed by administrators. Candidate groups include building and construction trades, electrical work, plumbing, vehicle and mechanical repair, appliance and electronics repair, cleaning, gardening and landscaping, tutoring and education, and photography and media.

---

11. Initial Exclusions

Do NOT implement initially:

- Online payment processing
- Transport marketplace
- AI project builder
- Automated price scraping
- Exact real-time inventory
- Native Android application
- Complex accounting
- Provider ranking
- Automatic provider recommendations
- Nationwide logistics
- Customer credit system
- Platform guarantees of work quality, escrow, or acting as the employer of providers

The architecture should allow these to be added later.

---

12. Future Features

Potential future modules:

Build My Project

Buyer describes a project and receives a preliminary materials list.

AI Materials Assistant

AI can assist with materials lists, quantity estimates, product searches and RFQ preparation. AI-generated information must always be clearly identified as an estimate.

Price History

Historical provider price information.

Multi-supplier Shopping

Buyer can construct an order using products from multiple suppliers.

Delivery Marketplace

Independent transport providers can offer delivery services.

Online Payments

Integrated payment processing, after evaluation for Papua New Guinea.

Business models (to evaluate in Phase 6, none decided)

Optional provider subscriptions, featured listings, lead-generation fees or commissions, if viable.

---

13. Phases

The roadmap is in ROADMAP.md. In short: Phase 1 Foundation (implemented, partially complete), Phase 2 General marketplace data model, Phase 3 Product marketplace, Phase 4 Services marketplace, Phase 5 Transactions and trust, Phase 6 Business development. Phases are built one after another. They are not built simultaneously.

---

14. Acceptance Tests (Proposed; to be confirmed when Phase 3 starts)

The MVP is considered functional when complete workflows work for products, for services and for administration.

Product workflow (the original acceptance test, retained)

Provider: register, create profile, add product, set price, set stock, receive RFQ, create quotation, submit quotation.

Buyer: register, search product, view providers, create project, create materials list, select providers, send RFQ, receive quotation, view or download quotation, accept quotation, create order.

Service workflow (new, Planned)

Provider: register, create profile, add service with indicative rate and service area, receive service request, send quotation, confirm booking, mark job completed.

Buyer: register, search services by category and location, view provider profile, send service request, receive quotation, accept, track booking, leave a review.

Administrator workflow

Login, view users, manage providers and verification, manage categories, moderate listings and reviews, handle complaints, view marketplace activity, view audit logs.

---

15. Development Principle

Prioritize:

Working > Simple > Secure > Testable > Useful > Expandable

Do not introduce unnecessary complexity into the MVP.

---

# Part 2 - Detailed requirements for the product marketplace

These are the detailed requirements written for the original building-materials marketplace. They apply to the product side of the marketplace and are all Planned (except the Phase 1 foundation described in Part 1).

Reading guide: "Customer" means a buyer. "Supplier" means a provider who sells products. How these terms relate to the account model in section 4 is a Phase 2 decision. Section numbers keep their original numbers, prefixed with P (P3 and P5 to P22). P3 lists what the three Phase 1 roles can do; it will be revisited in Phase 2 together with the account model.

---

P3. User Roles

The MVP has three main roles.

P3.1 Customer

Can:

- Register
- Log in
- Manage profile
- Search products
- Search suppliers
- View product information
- Compare supplier prices
- Create projects
- Create materials lists
- Send RFQs
- Receive quotations
- Compare quotations
- Accept quotations
- Create orders
- View order status
- Download quotations


---

P3.2 Supplier

Can:

- Register as a supplier
- Create business profile
- Manage products
- Set prices
- Set stock status
- Update prices
- Receive RFQs
- Respond to RFQs
- Create quotations
- Manage quotations
- Receive orders
- Update order status


---

P3.3 Administrator

Can:

- Manage users
- Manage suppliers
- Verify/suspend suppliers
- Manage categories
- Manage products where necessary
- View RFQs
- View quotations
- View orders
- View reports
- Manage system settings
- Review audit logs

---

P5. Supplier Portal

P5.1 Supplier Registration

Supplier registration must collect:

- Business name
- Contact person's name
- Phone
- Email
- Business address
- Location
- Business description
- Optional business registration information

Supplier account status:

- Pending
- Verified
- Suspended

---

P5.2 Supplier Profile

Supplier can manage:

- Business name
- Logo
- Description
- Address
- Location
- Phone
- Email
- Opening information
- Delivery availability
- Pickup availability

---

P6. Product Catalogue

Suppliers can create products.

Required fields:

- Product name
- Category
- Unit
- Description

Optional:

- Brand
- Specification
- Size
- Grade
- Product image
- Supplier product code

Example:

Portland Cement

Category:
Cement & Concrete

Unit:
Bag

Specification:
40 kg

---

P7. Supplier Pricing

Each supplier controls its own product price.

Required:

- Product
- Price
- Currency
- Unit
- Stock status
- Last updated timestamp

Default currency:

PGK

Stock statuses:

- In Stock
- Limited Stock
- Out of Stock
- Contact Supplier

The system must display when the supplier last updated the information.

The platform must not guarantee that displayed stock is real-time.

---

P8. Product Search

Customers must be able to search by:

- Product name
- Category
- Brand
- Specification
- Supplier
- Location

Search results should display:

- Product
- Supplier
- Price
- Unit
- Stock status
- Last updated

---

P9. Price Comparison

Customers may compare supplier-provided prices for equivalent or similar products.

The interface should show factual information such as:

Supplier| Price| Unit| Stock| Updated
Supplier A| K38| Bag| In Stock| Date
Supplier B| K40| Bag| In Stock| Date
Supplier C| K39| Bag| Limited| Date

The system must not make a purchasing decision for the customer.

---

P10. Projects

Customers can create projects.

Example:

Project Name: New House

Fields:

- Project name
- Description
- Location
- Customer
- Created date

---

P11. Materials Lists

Each project can contain multiple material items.

Each item contains:

- Description
- Product, if selected
- Quantity
- Unit
- Notes

Example:

Cement       100 bags
Steel        20 lengths
Roofing      50 sheets
Timber       200 lengths

A materials list can be edited before being submitted as an RFQ.

---

P12. Request for Quotation

A customer can create an RFQ from a materials list.

RFQ must contain:

- Customer
- Project
- RFQ number
- Request date
- Required date
- Delivery location
- Pickup/delivery preference
- Notes
- Requested materials

Customer may select:

- One supplier
- Multiple suppliers

---

P13. Supplier RFQ Management

Supplier dashboard must have:

RFQ Inbox

Each RFQ displays:

- RFQ number
- Customer
- Project
- Request date
- Required date
- Delivery location
- Items
- RFQ status

Supplier can:

- Open RFQ
- Accept/respond
- Decline
- Prepare quotation

---

P14. Quotations

Supplier quotation fields:

- Supplier
- Customer
- RFQ
- Quotation number
- Quotation date
- Valid until
- Items
- Unit prices
- Discounts
- Delivery fee
- Other charges
- Total
- Notes
- Terms

The system automatically calculates:

Subtotal
- Discount
+ Delivery
+ Other charges
= Total

Supplier must be able to review the quotation before submission.

---

P15. Quotation PDF

The system must generate a professional PDF containing:

- Supplier name
- Supplier contact information
- Customer information
- Quotation number
- Date
- Validity
- Item table
- Quantity
- Unit
- Unit price
- Line total
- Subtotal
- Discount
- Delivery
- Other charges
- Grand total
- Supplier terms
- Notes

---

P16. Customer Quotation Management

Customer dashboard:

My Quotations

Customer can:

- View quotation
- Download PDF
- Compare quotations
- Accept quotation
- Decline quotation

The platform must not recommend which supplier to select.

---

P17. Orders

When a customer accepts a quotation, the system creates an order.

Order contains:

- Order number
- Customer
- Supplier
- Quotation
- Items
- Total
- Order date
- Status

Initial order statuses:

Pending Supplier Confirmation
Confirmed
Preparing
Ready for Pickup
Out for Delivery
Completed
Cancelled

---

P18. Payments

Online payment is out of MVP scope.

Initially:

- Customer and supplier arrange payment directly.
- The platform records the order but does not process customer funds.

Future payment methods may include:

- Bank transfer
- Mobile money
- Card
- Other PNG-supported payment providers

---

P19. Delivery

MVP supports:

- Customer pickup
- Supplier delivery

Supplier may specify:

- Delivery available
- Delivery fee
- Delivery area

A full transport marketplace is future functionality.

---

P20. Notifications

MVP notifications:

- New RFQ
- New quotation
- Quotation accepted
- New order
- Order status changed

Initial channels:

- In-app notifications
- Email where available

Future:

- SMS
- Push notifications
- WhatsApp

---

P21. Product Categories

Initial categories:

1. Cement & Concrete
2. Steel & Reinforcement
3. Timber
4. Roofing
5. Plumbing
6. Electrical
7. Paint
8. Building Boards
9. Doors & Windows
10. Fencing
11. Water & Tanks
12. Tools
13. Safety Equipment
14. General Hardware
15. Other

Administrator can add/edit categories.

---

P22. Admin Functions

Administrator dashboard must provide:

Users

- View
- Search
- Activate
- Suspend

Suppliers

- View
- Verify
- Suspend
- Edit status

Products

- View
- Search
- Manage categories

RFQs

- View
- Search
- Monitor status

Quotations

- View
- Search

Orders

- View
- Search
- Monitor status

Audit Logs

- View important system actions

---

End of document.
