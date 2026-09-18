PNG Materials Marketplace

Project Requirements

Version: 0.1
Status: MVP Development Specification
Target Market: Papua New Guinea
Product Type: Mobile-first Web Application / PWA

---

1. Project Purpose

PNG Materials Marketplace is a digital marketplace connecting customers with hardware stores, building-material suppliers, wholesalers and retailers.

The platform allows customers to:

1. Find materials and suppliers.
2. View supplier-provided prices.
3. Compare available supplier prices.
4. Create project-based materials lists.
5. Send a Request for Quotation (RFQ) to one or multiple suppliers.
6. Receive supplier quotations.
7. Compare quotations.
8. Accept a quotation.
9. Create and manage an order.

Suppliers can:

1. Create a business account.
2. Maintain their business profile.
3. Add and manage products.
4. Set their own prices.
5. Set stock-status information.
6. Receive RFQs.
7. Prepare quotations.
8. Manage accepted orders.

The platform facilitates the transaction but does not become the seller of the products.

---

2. Core Product Principle

The system must distinguish between:

Supplier-provided information

Examples:

- Product name
- Product specification
- Price
- Stock status
- Delivery fee
- Quotation
- Availability

and:

Platform-generated information

Examples:

- Search results
- Price comparisons
- RFQ numbers
- Quotation PDFs
- Order numbers
- Notifications
- Status tracking

The platform must never present an estimated or AI-generated price as an actual supplier price.

---

3. User Roles

The MVP has three main roles.

3.1 Customer

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

3.2 Supplier

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

3.3 Administrator

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

4. MVP Functional Requirements

4.1 Authentication

The system must provide:

- Registration
- Login
- Logout
- Password hashing
- Password reset
- Session management
- Role-based authorization

A user must only access functions permitted for their role.

---

5. Supplier Portal

5.1 Supplier Registration

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

5.2 Supplier Profile

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

6. Product Catalogue

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

7. Supplier Pricing

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

8. Product Search

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

9. Price Comparison

Customers may compare supplier-provided prices for equivalent or similar products.

The interface should show factual information such as:

Supplier| Price| Unit| Stock| Updated
Supplier A| K38| Bag| In Stock| Date
Supplier B| K40| Bag| In Stock| Date
Supplier C| K39| Bag| Limited| Date

The system must not make a purchasing decision for the customer.

---

10. Projects

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

11. Materials Lists

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

12. Request for Quotation

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

13. Supplier RFQ Management

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

14. Quotations

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

15. Quotation PDF

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

16. Customer Quotation Management

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

17. Orders

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

18. Payments

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

19. Delivery

MVP supports:

- Customer pickup
- Supplier delivery

Supplier may specify:

- Delivery available
- Delivery fee
- Delivery area

A full transport marketplace is future functionality.

---

20. Notifications

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

21. Product Categories

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

22. Admin Functions

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

23. Security Requirements

The application must implement:

- Password hashing
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

---

24. MVP Exclusions

Do NOT implement initially:

- Online payment processing
- Transport marketplace
- AI project builder
- Automated price scraping
- Exact real-time inventory
- Native Android application
- Complex accounting
- Supplier ranking
- Automatic supplier recommendations
- Nationwide logistics
- Customer credit system

The architecture should allow these to be added later.

---

25. Future Features

Potential future modules:

Build My Project

Customer describes a project and receives a preliminary materials list.

AI Materials Assistant

AI can assist with:

- Materials lists
- Quantity estimates
- Product searches
- RFQ preparation

AI-generated information must always be clearly identified as an estimate.

Price History

Historical supplier price information.

Multi-supplier Shopping

Customer can construct an order using products from multiple suppliers.

Delivery Marketplace

Independent transport providers can offer delivery services.

Online Payments

Integrated payment processing.

---

26. MVP Acceptance Test

The MVP is considered functional when the following complete workflow works:

Supplier

Register
↓
Create supplier profile
↓
Add product
↓
Set price
↓
Set stock
↓
Receive RFQ
↓
Create quotation
↓
Submit quotation

Customer

Register
↓
Search product
↓
View suppliers
↓
Create project
↓
Create materials list
↓
Select supplier(s)
↓
Send RFQ
↓
Receive quotation
↓
View/download quotation
↓
Accept quotation
↓
Create order

Administrator

Login
↓
View users
↓
Manage suppliers
↓
Manage categories
↓
View marketplace activity
↓
View audit logs

All three workflows must work before the MVP is considered complete.

---

27. Development Principle

Prioritize:

Working > Simple > Secure > Testable > Useful > Expandable

Do not introduce unnecessary complexity into the MVP.
