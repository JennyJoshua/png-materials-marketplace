# PNG Materials Marketplace

A mobile-first marketplace connecting buyers with product suppliers across Papua New Guinea. Building materials are the initial focus. Suppliers control their own listings, prices and stock.

## Current project status

**Phase 3 backend:** provider profiles, product listing records, public product APIs, category API, provider listing management APIs and administrator moderation are implemented. The Phase 3 production migration was applied and verified by the project owner.

**Phase 4 — Marketplace completion and user experience:** in development on `feature/phase-4-marketplace-experience`. This phase adds the public product catalogue and detail pages, buyer search/filtering, provider listing workspace, and launch-oriented homepage/navigation.

## Main capabilities

- Public browsing without an account.
- Search products by name, brand and specifications.
- Filter by category, province and stock status; sort by price or recent updates.
- View PGK price, unit, availability, supplier identity, location and contact details.
- Providers manage their own drafts and published listings.
- Server-side authorization and provider ownership checks remain authoritative.

## Roadmap

1. Foundation — authentication, profiles and security baseline.
2. Provider foundation — provider profiles, categories and verification.
3. Product marketplace backend — product listing data, APIs and moderation.
4. Marketplace experience — public catalogue, product details, provider listing workspace and launch polish.
5. Customer enquiries and supplier quotations.
6. Orders and transaction management.
7. Trust, verification and reputation improvements.
8. Payments and business tools, subject to PNG suitability and separate approval.
9. Expansion and intelligent services.

## Local development

Requirements: Node.js 20.19+ and npm.

```bash
npm ci
npm run db:generate
npm run typecheck
npm test
npm run lint
npm run build
```

Configure the required environment variables using the project’s environment guide. Never commit credentials or production secrets.

## Important operating principles

- Public listing visibility requires an active listing, active category and active provider.
- Provider listing operations are scoped to the authenticated provider.
- Product prices are supplier-provided and should be confirmed directly.
- The marketplace does not process orders or payments in Phase 4.
- Database migrations, production settings, merges to `main` and production deployments require owner approval.
