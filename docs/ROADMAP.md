# Project Roadmap

Last updated: 2 November 2026.

This roadmap reflects the current agreed implementation sequence. Building materials remain the initial product category, while the longer-term platform may support a wider range of goods and services.

## Phase status

| Phase | Scope | Status |
|---|---|---|
| 1 | Foundation: authentication, accounts, security baseline | Implemented; historical verification notes retained in docs/REVIEW.md |
| 2 | Provider foundation: provider profiles, categories, verification | Implemented |
| 3 | Product marketplace backend: listings, public APIs, provider management and moderation | Implemented and deployed; production migration verified by owner |
| 4 | Marketplace experience: public catalogue, product detail, provider listing workspace, launch polish | In development |
| 5 | Customer enquiries and supplier quotations | Planned |
| 6 | Orders and transaction management | Planned |
| 7 | Trust, verification and reputation | Planned |
| 8 | Payments and business tools | Deferred pending PNG suitability assessment and explicit approval |
| 9 | Expansion and intelligent services | Future |

## Phase 4 scope

- Public product catalogue, accessible without signing in.
- Search by product name, brand and specifications through the existing API.
- Category, province and stock-status filters.
- Price sorting, bounded pagination, loading, error and empty states.
- Product details: PGK price and unit, specifications, description, stock update dates, supplier identity, location and public contact details.
- Provider workspace: create and edit owned listings; publish, unpublish and archive through existing protected APIs.
- Updated homepage, navigation, responsive presentation and clear buyer/supplier guidance.
- Documentation and automated tests.

## Phase 4 exclusions

No new database migration is expected for the current interface work. Product image uploads are deferred until a storage bucket, access rules, file validation, size limits and moderation requirements are reviewed. Enquiries, quotations, orders, bookings, payments, reviews, AI pricing and scraping are not part of Phase 4.

## Release controls

Work is carried out on a dedicated feature branch. Automated tests, lint, type checking, Prisma validation and production build must pass before a merge is proposed. No merge to `main`, production database change, Render configuration change or production deployment occurs without the project owner's explicit approval.
