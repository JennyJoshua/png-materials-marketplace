# Provider-only accounts and public marketplace access

**Decision date:** 3 November 2026  
**Status:** Approved product direction; application implementation is being developed on `feature/provider-only-registration-public-marketplace`.  
**Repository:** JennyJoshua/png-materials-marketplace

## Decision

The marketplace is public by default. Anyone may browse, search, compare goods and services, and view public provider profiles without registering or signing in. There is no buyer/customer registration, buyer account or buyer dashboard.

Registration is exclusively for:

- **Individual providers** — people offering products, services or both.
- **Business providers** — businesses/organisations offering products, services or both.

Provider form (individual/business) is distinct from marketplace capability (products/services/both). One provider identity can manage both goods and services. A provider who wants to search for or purchase goods/services from another provider uses the same public visitor experience as everyone else, without signing in as a buyer.

## Functional rules

- Public browsing and search are available without authentication.
- Public provider profiles and active listings are visible without authentication.
- No buyer/customer registration, account, dashboard or mandatory customer sign-in.
- Provider authentication is required only for provider-owned profile/listing management and provider-side workflows.
- Administrator access remains restricted and cannot be selected during public registration.
- Future enquiries, quotation requests, orders and bookings are guest-first. Collect only the minimum contact and fulfilment details required for the specific interaction; do not require a reusable buyer account by default.
- One provider may offer products, services or both, regardless of whether the provider is an individual or business.

## Implementation boundary

This branch is a product/architecture decision update. The existing application still contains legacy CUSTOMER/SUPPLIER role, customer profile and customer dashboard code. It must not be assumed that the live application has already been converted.

A subsequent implementation change must inspect the exact current schema and deployed data; map individual/business registration to the provider foundation; remove buyer registration and customer-only protected flows; preserve ADMIN restrictions and provider ownership checks; keep public discovery unauthenticated; and add guest-first enquiry/transaction handling.

Do not delete or convert existing CUSTOMER users, customer profile rows or transaction references without an explicit backward-compatible migration plan. Preserve audit history. No production migration, merge or deployment is authorised by this decision alone.

## Acceptance criteria

1. Anyone can browse and search without signing in.
2. Public registration offers no buyer/customer option.
3. Individual providers can register.
4. Business providers can register.
5. Both provider kinds can offer products, services or both under one provider identity.
6. A provider can browse and purchase as an ordinary visitor without a buyer account.
7. Provider management requires authentication and server-side ownership checks.
8. ADMIN remains restricted.
9. Future customer-side requests are guest-first by default.
10. Existing customer-related data is preserved until an approved migration plan is applied.

## Files updated on this branch

- README.md
- docs/PROJECT_REQUIREMENTS.md
- docs/ARCHITECTURE.md
- docs/DECISIONS.md
- docs/ACCOUNT_ACCESS_MODEL_DECISION.md (this document)

## Not changed

No application code, Prisma schema, SQL migration, Supabase data, Render configuration, GitHub Actions workflow, production deployment or main branch was changed. This is intentional: the account-model change has implications for legacy users and database records, so implementation must be reviewed separately rather than silently altering live identity/role handling.
