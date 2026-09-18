PNG Materials Marketplace

System Architecture

Version: 0.1

---

1. Architecture Overview

The application uses a modern three-layer architecture:

┌──────────────────────────────────────┐
│          WEB / PWA FRONTEND          │
│          Next.js + React             │
└──────────────────┬───────────────────┘
                   │
                   │ HTTPS / JSON API
                   ▼
┌──────────────────────────────────────┐
│           APPLICATION LAYER          │
│ Authentication                       │
│ Authorization                        │
│ Business Logic                       │
│ RFQ Processing                       │
│ Quotation Calculation                │
│ Order Processing                      │
│ Notifications                        │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│             DATA LAYER               │
│ PostgreSQL                            │
│ File/Object Storage                  │
└──────────────────────────────────────┘

---

2. Recommended Technology

Frontend

- Next.js
- React
- TypeScript
- Responsive CSS/UI framework
- PWA support

Backend

Use Next.js server-side functionality initially unless a separate API becomes necessary.

API format:

REST + JSON

Database

PostgreSQL

ORM

Recommended:

Prisma

The ORM must not prevent direct SQL migrations where necessary.

Authentication

Use a mature authentication solution compatible with Next.js.

The implementation must use secure password hashing.

PDF

Use a server-side PDF generation library.

Storage

Use object/file storage for:

- Logos
- Product images
- Quotation PDFs
- Other uploaded documents

---

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

20. Environment Configuration

Secrets must be stored in environment variables.

Examples:

DATABASE_URL
AUTH_SECRET
EMAIL_SERVER
STORAGE_ACCESS_KEY
STORAGE_SECRET_KEY

Never commit secrets to GitHub.

Provide:

.env.example

containing variable names but not real credentials.

---

21. Deployment Architecture

Initial production:

User
 │
 ▼
HTTPS
 │
 ▼
Web Application
 │
 ├── API
 │
 ├── Authentication
 │
 └── Application Logic
 │
 ▼
PostgreSQL
 │
 ▼
File Storage

The architecture must allow the hosting provider to be changed later without rewriting the application.

---

22. Testing

At minimum:

Unit tests

Test:

- Price calculations
- Quotation totals
- Permissions
- Status transitions
- Validation

Integration tests

Test:

- Registration
- Product creation
- RFQ creation
- Quotation creation
- Order creation

End-to-end test

Complete:

Supplier registers
→ adds product
→ customer registers
→ searches product
→ creates project
→ creates RFQ
→ supplier responds
→ customer accepts
→ order created

---

23. Architecture Principle

Do not over-engineer the MVP.

Start with:

One application + one PostgreSQL database + one storage system.

Only split services when there is a demonstrated technical requirement.

This keeps development, deployment and maintenance manageable.
