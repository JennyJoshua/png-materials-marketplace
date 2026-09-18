PNG Materials Marketplace

A mobile-first digital marketplace for building materials and hardware suppliers in Papua New Guinea.

Product Vision

Help customers:

Find → Compare → Request → Quote → Order

Help suppliers:

List → Price → Receive RFQs → Quote → Fulfil Orders

The platform is a marketplace/facilitation system. Suppliers remain responsible for their own products, prices, stock information, quotations, fulfilment and commercial terms.

---

Current Development Status

Version: 0.1
Current Phase: Phase 1 — Foundation

The project is being developed incrementally.

Do not implement future phases unless explicitly instructed.

---

Technology

Preferred stack:

- Next.js
- React
- TypeScript
- PostgreSQL
- Prisma
- Responsive mobile-first UI
- PWA capability
- GitHub

---

User Roles

The system supports:

CUSTOMER

Customers search materials, create projects, request quotations and manage orders.

SUPPLIER

Suppliers manage business profiles, products, prices, stock information, RFQs, quotations and orders.

ADMIN

Administrators manage users, suppliers, categories, marketplace data and system activity.

---

Phase 1 Objective

Build the technical foundation required for the marketplace.

Phase 1 includes:

- Project setup
- Database connection
- Prisma
- Authentication
- User registration
- Login
- Logout
- User roles
- Basic protected dashboards
- Basic application layout
- Environment configuration
- Initial database migrations
- Seed categories
- Basic security
- Testing foundation

Phase 1 does NOT include:

- Product marketplace
- Supplier product management
- RFQs
- Quotations
- Orders
- Payments
- Delivery
- AI features

---

Development Principle

Keep the implementation:

Simple → Secure → Testable → Expandable

Do not add unnecessary dependencies or architecture.

Avoid premature microservices.

The initial application should remain a single deployable application with PostgreSQL.

---

Documentation

Project documentation:

PROJECT_REQUIREMENTS.md
ARCHITECTURE.md
DATABASE.md
DECISIONS.md
CHANGELOG.md
REVIEW.md
handovers/

Read the relevant documentation before implementing changes.

---

Git Workflow

Use clear commits.

Examples:

feat: initialize Next.js application
feat: add database schema
feat: add authentication
feat: add role-based dashboards
test: add authentication tests
fix: correct session authorization

Do not commit:

- ".env"
- passwords
- API keys
- database credentials
- private certificates
- production secrets

---

Environment

Provide:

.env.example

Never place real secrets in the repository.

---

Running Locally

The README must document:

1. Installing dependencies
2. Creating ".env"
3. Starting PostgreSQL
4. Running migrations
5. Seeding development data
6. Starting development server
7. Running tests

The exact commands should be updated by the implementation agent according to the chosen package configuration.

---

Definition of Done

Phase 1 is complete only when:

- Application starts successfully
- Database connects successfully
- Migrations run successfully
- Seed data works
- Customer can register
- Supplier can register
- Admin account can be created securely for development
- Users can log in
- Users can log out
- Protected routes work
- Role restrictions work server-side
- Basic dashboards render
- Tests pass
- No secrets are committed
- Production build succeeds
