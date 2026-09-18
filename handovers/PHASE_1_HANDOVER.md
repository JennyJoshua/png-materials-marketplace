Phase 1 Implementation Handover

Project

PNG Materials Marketplace

Phase

Phase 1 — Foundation

Objective

Implement the technical foundation of the PNG Materials Marketplace without implementing marketplace business functionality yet.

---

1. Read First

Before changing code, read:

README.md
PROJECT_REQUIREMENTS.md
ARCHITECTURE.md
DATABASE.md
DECISIONS.md
CHANGELOG.md
REVIEW.md

These documents define the current project direction.

---

2. Required Technology

Use:

- Next.js
- React
- TypeScript
- PostgreSQL
- Prisma
- Secure authentication
- Responsive mobile-first UI

Use current stable versions compatible with each other.

Do not add unnecessary libraries.

---

3. Phase 1 Scope

Implement:

Application

- Next.js project
- TypeScript
- Basic application layout
- Navigation
- Error handling foundation

Database

- PostgreSQL connection
- Prisma configuration
- Initial migrations
- Core user tables
- Customer profile
- Supplier profile
- Product categories

Authentication

- Registration
- Login
- Logout
- Password hashing
- Sessions
- Protected routes

Roles

Implement:

CUSTOMER
SUPPLIER
ADMIN

Dashboards

Create simple working dashboards:

/customer/dashboard
/supplier/dashboard
/admin/dashboard

Each dashboard must only be accessible to the appropriate role.

---

4. Registration

Customer registration:

Full name
Email
Phone
Password
Confirm password

Supplier registration:

Contact name
Business name
Email
Phone
Password
Confirm password
Business address
Location

Supplier registration should create:

User
+
Supplier Profile

Supplier verification status initially:

PENDING

---

5. Admin Development Account

Provide a safe development mechanism for creating an administrator.

Do NOT hard-code a production admin password.

The implementation may use a documented development seed process.

Example concept:

npm run seed

The seed credentials must be development-only and clearly documented.

Production credentials must be supplied through secure environment configuration.

---

6. Authorization

Implement server-side role checks.

Example:

CUSTOMER
→ /customer/*

SUPPLIER
→ /supplier/*

ADMIN
→ /admin/*

A customer attempting to access supplier or admin functionality must receive an authorization error or be redirected appropriately.

The server must enforce authorization even if the user manually calls the API.

---

7. Initial Database

Implement at least:

users
customer_profiles
supplier_profiles
product_categories

Additional marketplace tables should only be created if they are necessary for the chosen authentication architecture or migration foundation.

Do not prematurely implement RFQ, quotation or order business logic in Phase 1.

---

8. UI Requirements

The UI must be:

- Mobile-first
- Responsive
- Clean
- Simple
- Touch-friendly

Create a consistent application shell:

Header
Navigation
Main Content
Footer

Use placeholder dashboard cards where functionality belongs to future phases.

Example customer dashboard:

My Dashboard

Find Materials
My Projects
My RFQs
My Quotations
My Orders

These future functions may display:

Coming in a future phase

They must not pretend to work.

---

9. Security Requirements

Implement:

- Password hashing
- Secure session handling
- Server-side authorization
- Input validation
- Rate limiting where appropriate
- Secure cookies
- CSRF protection where applicable
- Environment-based secrets
- Safe database access
- Generic authentication error messages

Never expose password hashes to the frontend.

Never store plaintext passwords.

---

10. Validation

Validate:

- Email format
- Required fields
- Password requirements
- Duplicate email
- Duplicate phone where enforced
- Supplier business name
- Invalid role manipulation

Never trust role values supplied by the client.

---

11. Database Seed

Seed the initial product categories:

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

---

12. Tests

Create tests for:

Authentication

- Customer registration
- Supplier registration
- Login
- Invalid login
- Logout

Authorization

- Customer cannot access supplier dashboard
- Customer cannot access admin dashboard
- Supplier cannot access admin dashboard
- Admin can access admin dashboard

Database

- User creation
- Supplier profile creation
- Customer profile creation
- Category seed

---

13. Build Verification

Before declaring Phase 1 complete:

Install dependencies
↓
Configure environment
↓
Connect database
↓
Run migration
↓
Seed database
↓
Start application
↓
Register customer
↓
Register supplier
↓
Login
↓
Test role protection
↓
Run tests
↓
Production build

All must succeed.

---

14. Do Not Implement Yet

Do not implement:

- Product catalogue UI
- Supplier pricing
- Stock management
- Product search
- Materials lists
- RFQs
- Quotations
- PDF quotations
- Orders
- Payments
- Delivery marketplace
- AI
- SMS
- WhatsApp integration

These belong to later phases.

---

15. Completion Report

When Phase 1 is complete, create/update:

CHANGELOG.md
REVIEW.md

Also produce a development report containing:

1. What was implemented
2. Files created
3. Database migrations
4. Dependencies added
5. Environment variables required
6. Commands to run
7. Tests performed
8. Test results
9. Security considerations
10. Known limitations
11. Recommended next phase

Do not claim functionality that was not tested.

---

16. Git Commit

Use a clear commit such as:

feat: implement phase 1 marketplace foundation

Do not commit secrets.

---

Final Instruction

Implement only Phase 1.

If a technical decision is required that conflicts with the project documents, stop and document the issue in "REVIEW.md" or "DECISIONS.md" rather than silently changing the architecture.

Keep the implementation simple and production-minded.
