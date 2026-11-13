# Phase 5A — Enquiry foundation

Status: implemented on `feat/phase-5-enquiry-foundation`; automated validation passed. Existing migration checksum reconciliation and owner review remain outstanding.

## Scope

This batch adds only the data and credential foundation for guest-first enquiries:

- `Enquiry`: one enquiry routes to exactly one provider.
- `EnquiryMessage`: visitor, provider, or system conversation entries.
- `EnquiryAccessCredential`: hashed visitor access credentials.
- `lib/enquiries/access-credential.ts`: cryptographically secure token creation and verification.
- One additive Prisma migration and focused tests.

It does not add public submission endpoints, visitor sessions/cookies, provider inbox pages, messaging APIs, quotations, notifications, attachments, service listings, or admin screens.

## Enquiry targeting

- Product enquiries require a product listing and cannot carry a service category.
- Service enquiries require a service category and cannot carry a product listing.
- The database composite foreign key requires a selected product listing to belong to the same provider as the enquiry.
- Every enquiry has one required provider profile.
- The public submission layer (a later batch) must resolve the provider from trusted listing/profile data; it must not trust a visitor-supplied provider ID.
- The public submission layer must additionally verify that the provider is ACTIVE and has a compatible `providerType`. The current provider schema does not yet map service categories to provider profiles, so this validation and discovery design must be completed before service submission is exposed.

## Visitor access credentials

- Generate 32 cryptographically random bytes and encode them as base64url.
- Persist only the SHA-256 hex digest (64 lowercase hexadecimal characters).
- Compare fixed-length digest buffers with `timingSafeEqual`.
- Never log or place raw visitor tokens in URLs, analytics, or audit metadata.
- Credential expiry, revocation, and last-use fields are stored; issuance policy and visitor session/cookie handling are deferred to a later batch.

## Database security

The migration enables RLS on all three new tables, creates no policies, and revokes all table privileges from PUBLIC and (when present) Supabase `anon` and `authenticated` roles. Application access must remain server-side through Prisma with explicit authorization checks; Prisma bypasses RLS.

## Migration safety

Migration: `20261112000000_phase5_enquiry_foundation`.

The migration is additive and has not been applied to the live Supabase database. Do not run `prisma migrate deploy`, `prisma db push`, `prisma migrate dev`, or any production SQL for this phase until the owner separately approves the migration plan. Existing migration files must remain unchanged.

## Acceptance gates

Before merge, verify:

1. Prisma schema validation and client generation.
2. Full Vitest suite, lint, typecheck, and production build.
3. Migration SQL against a disposable PostgreSQL database.
4. All four previously applied migration checksums against the committed migration files and the live Prisma migration ledger.
5. The resulting migration is additive, enables RLS, has no policies, and grants no direct table access to client roles.
6. No raw visitor token is persisted or logged.

No merge, production migration, or deployment is authorised by this handover.
