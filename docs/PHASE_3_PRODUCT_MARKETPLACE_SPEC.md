# Phase 3 — Product Marketplace Specification

Status: Draft for owner review  
Branch: `design/phase-3-product-marketplace`  
Scope: Design only. No application code, schema, migration, deployment, or production database changes are included.

## 1. Purpose

Allow an approved provider to publish and maintain physical product listings, and allow buyers to browse, search, filter, and compare provider-supplied prices across Papua New Guinea.

Building materials remain an important initial category. The design must support other goods without changing the core listing model.

## 2. Existing foundations to preserve

- Supabase Auth remains the only authentication system.
- `users.role` remains CUSTOMER, SUPPLIER, or ADMIN; Phase 3 does not redesign roles or registration.
- A provider is identified by the server-loaded `provider_profiles` record, not by a client-supplied role or profile ID.
- Only a provider profile with status ACTIVE may publish a public product listing.
- Provider verification remains separate from provider status. Do not describe an unverified provider as verified.
- Existing `product_categories` and its 15 seeded building-material categories are retained and extended; do not replace or reseed destructively.
- Existing `supplier_profiles` records and all historical data remain untouched.
- Use the existing Next.js, Prisma, Supabase PostgreSQL, Render and GitHub architecture. No paid service or API is assumed.

## 3. Phase 3 scope

### Included

1. Provider product-listing management:
   - Create a draft listing.
   - Edit a listing owned by the provider.
   - Publish, unpublish, and archive a listing.
   - Set or update the provider's own catalogue price.
   - Set or update the stock status.
2. Public product marketplace:
   - Browse active listings.
   - Search by product name, brand and specification.
   - Filter by category, provider, province/district, stock status and price range.
   - Sort by name, price and most recently updated.
   - View listing and provider summary.
3. Product category administration:
   - Add, edit, activate and deactivate categories.
   - Preserve existing categories and their IDs.
4. Administrator listing moderation:
   - View listings.
   - Suspend or restore listings with an audit record.
5. Tests, documentation, security review and a reviewed additive database migration.

### Explicitly excluded

- RFQs, quotations, orders, shopping carts or checkout (Phase 5).
- Online payments, commissions, subscriptions or featured placements.
- Product reviews and ratings.
- AI-generated products, estimates or recommendations.
- Automated price scraping.
- Exact or guaranteed real-time inventory.
- Product image uploads and storage buckets; defer until storage and upload security are separately designed.
- Multi-supplier baskets, product variants, complex inventory, warehouses and stock quantities.
- External search engines; use PostgreSQL search and indexes first.
- Price-history charts or a full price-history ledger. The current provider price and its last-updated timestamp are required; history can be considered later.

## 4. Proposed listing model

Recommended simple MVP approach: each provider creates its own listing. Do not introduce a global product catalogue or complex product-to-offer matching in this phase.

A listing should contain:

| Field | Requirement |
|---|---|
| Provider profile | Required; derived and checked server-side from the authenticated owner |
| Category | Required; must reference an active product category |
| Product name | Required; short, searchable |
| Brand | Optional |
| Specification | Optional; e.g. grade, size, model or material |
| Description | Optional, length-limited plain text |
| Unit | Required; e.g. each, bag, length, sheet, tonne, kg, litre, box |
| Catalogue price | Required before publication; provider-entered positive PGK amount |
| Stock status | Required; IN_STOCK, LIMITED_STOCK, OUT_OF_STOCK or CONTACT_SUPPLIER |
| Price updated at | Set by server when the price changes |
| Stock updated at | Set by server when stock status changes |
| Listing status | DRAFT, ACTIVE, SUSPENDED or ARCHIVED |
| Created/updated timestamps | Server-managed |

Use PostgreSQL `NUMERIC` with an explicitly selected precision/scale for money; do not use floating-point storage for prices. Display currency as PGK / K. Prices are provider-supplied and are not platform estimates.

A listing must not be publicly visible unless its status is ACTIVE, its category is active, and its provider profile is ACTIVE. Verification labels are displayed only according to the existing verification level and must not be inferred from ACTIVE status.

## 5. Price and stock rules

- Each provider controls their own catalogue price and stock status.
- A price change updates `price_updated_at`; a stock change updates `stock_updated_at`. Editing an unrelated field must not make the price or stock appear freshly confirmed.
- Display the last-updated date beside price and stock information.
- Stock status is provider-reported, not live inventory and not a guarantee.
- A price is for the stated unit. The UI must not compare unlike units as if they were equivalent.
- Do not silently convert units or infer missing prices.
- No listing may be published without a valid price, unit, category and stock status.
- A later quotation price must remain separate from the catalogue price (Phase 5).

## 6. Authorization and privacy

- Public browsing uses server-side Next.js routes and Prisma. Do not grant public Supabase `anon` or `authenticated` access to marketplace tables.
- Every new table must have RLS enabled, no permissive policies by default, and public client-role privileges revoked as appropriate to the established architecture.
- Provider APIs authenticate with Supabase `getUser()`, load the application user and the owned provider profile from the database, and require provider status ACTIVE for publication and listing management.
- Never trust provider IDs, user IDs, role values, status, verification level, timestamps or price-update timestamps supplied by the browser.
- Every read and write for a private provider listing must be scoped to the authenticated user's provider profile.
- An owner must not edit another provider's listing by changing an ID.
- Only an ADMIN can manage categories or suspend/restore another provider's listing.
- Admin moderation actions must be audit-logged. Listing create, publish, price change, stock change, archive and admin moderation should also be logged with safe metadata; never log secrets.
- Do not expose private provider contact details beyond the fields already approved for the public provider summary.

## 7. Search and low-bandwidth requirements

- Use PostgreSQL indexes and queries; no Elasticsearch or external search service.
- Search fields: product name, brand and specification.
- Filters: category, provider, province, district, stock status and price range.
- Use stable pagination with a bounded page size. Do not load the entire catalogue into the browser.
- Public result cards should be compact and text-first; images are not required in this phase.
- Avoid heavy scripts, animation and large payloads. Design for Android phones, ordinary browsers and intermittent/slow connections.
- Show a clear empty state and a useful validation/error message. Never show raw database errors.

## 8. Suggested routes and API surface

These are design candidates; final names should be reconciled with the current route structure before implementation.

Public:
- `/marketplace` or `/products` — browse and search.
- `/products/[id]` — listing detail.

Provider:
- `/provider/products` — own listings.
- `/provider/products/new` — create listing.
- `/provider/products/[id]` — edit own listing.

Administrator:
- `/admin/products` — moderation.
- `/admin/categories` — product category management.

API candidates:
- `GET /api/products`
- `GET /api/products/[id]`
- `GET /api/providers/products`
- `POST /api/providers/products`
- `PATCH /api/providers/products/[id]`
- `POST /api/providers/products/[id]/publish`
- `POST /api/providers/products/[id]/archive`
- `GET/POST/PATCH /api/admin/categories`
- `GET /api/admin/products`
- `PATCH /api/admin/products/[id]/moderation`

Use the repository's established API response and error conventions rather than introducing a second pattern.

## 9. Acceptance tests

### Provider workflow
1. An authenticated user with an ACTIVE provider profile can create a draft product listing.
2. A user without a provider profile cannot create a listing.
3. A DRAFT, PENDING_REVIEW or SUSPENDED provider cannot publish.
4. A provider cannot read, edit, publish or archive another provider's listing by changing an ID.
5. A listing cannot be published without an active category, unit, positive price and stock status.
6. A provider can change their own price and stock status.
7. Price and stock timestamps change only when their corresponding values change.
8. An archived listing cannot be publicly discovered.

### Public buyer workflow
1. A buyer can browse and search ACTIVE listings without signing in, subject to the approved public-field policy.
2. Search matches product name, brand and specification.
3. Category, location, stock and price filters work together.
4. Results are paginated and stable.
5. Public results exclude DRAFT, SUSPENDED and ARCHIVED listings, inactive categories and non-ACTIVE providers.
6. Price, unit, stock status and last-updated information are displayed accurately.
7. A buyer can distinguish different units and providers; the interface does not imply unlike units are directly comparable.

### Administrator workflow
1. Only a database-authorized ADMIN can manage product categories.
2. Deactivating a category does not delete existing listings or historical data.
3. Only an ADMIN can suspend or restore a listing.
4. Moderation and category changes are audit-logged.
5. No public client-role database access is granted to the new tables.

### Regression and release
- Existing registration, login, logout, dashboards and provider profile flows continue to work.
- Existing Phase 1 and Phase 2 tests pass.
- Prisma schema validation and client generation pass.
- Migration applies to a disposable PostgreSQL database after all preceding migrations.
- RLS and grants are verified on the disposable database and then independently checked on production after the separately approved migration.
- CI tests, lint, typecheck and production build pass.
- No production migration, deployment or main-branch merge occurs without the required separate approval.

## 10. Implementation sequence after design approval

1. Review this specification and resolve open decisions.
2. Inspect current repository schema, routes, guards, audit helpers and category seed before designing tables.
3. Produce a file-by-file implementation plan and exact additive migration design.
4. Review the migration, authorization model and RLS/grants before coding.
5. Implement on a feature branch only.
6. Run tests and a disposable PostgreSQL migration/RLS test.
7. Review the full diff and validation evidence.
8. Obtain owner approval before merge to `main`.
9. Obtain separate owner approval before production migration and deployment.
10. Verify production RLS, category data, listing workflows and regression health.

## 11. Owner decisions required before implementation

The following defaults are recommended, but remain subject to owner approval:

1. **Listing model:** one independent provider-owned listing per provider (recommended); no shared global product catalogue in the MVP.
2. **Publication:** only ACTIVE provider profiles may publish; owner edits to a published listing keep it ACTIVE unless the edit affects a moderation-critical field (recommended to send such changes to review only if a concrete moderation rule is defined).
3. **Price:** required for public product listings; no “price on request” listings in this phase. Use CONTACT_SUPPLIER for stock uncertainty, not for missing price.
4. **Units:** provider selects from a small common unit list plus “Other” with a required label (recommended); no automatic unit conversion.
5. **Public contact:** show the provider's approved public profile summary and do not add new private contact exposure in Phase 3.
6. **Images:** defer uploads until a separate secure storage design; use text-only listings initially.
7. **Moderation:** administrator can suspend/restore listings; no automated moderation or ranking.

No production or source-code changes are authorised by this draft. Implementation begins only after the owner approves the design and the decisions above.
