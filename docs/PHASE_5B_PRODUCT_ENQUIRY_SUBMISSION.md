# Phase 5B — Public product enquiry submission

Status: implementation in review on `feat/phase5b-product-enquiry-api`.

## User experience

- Visitors can submit an enquiry without creating an account, signing in, or receiving an access token.
- Visitor name, email address, and phone number are required.
- The visitor selects a product listing; the server derives the provider from that listing.
- A successful response returns a public enquiry reference and submission status only.
- The provider inbox and any visitor enquiry-retrieval or reply flow are separate future work.

## Endpoint

`POST /api/enquiries`

Accepts JSON fields only:

- `productListingId`: UUID of a public product listing.
- `visitorName`: 1–120 characters.
- `visitorEmail`: valid email, up to 254 characters; stored lowercase.
- `visitorPhone`: 3–40 characters, allowing digits and common phone punctuation.
- `subject`: 1–160 characters.
- `message`: 1–4000 characters.

Unknown properties are rejected. The request must be same-origin JSON and no larger than 16 KiB.

## Server-side controls

- Listing must be ACTIVE, its category ACTIVE, and its provider ACTIVE with provider type PRODUCTS or BOTH.
- Provider identity is never accepted from the visitor.
- Service enquiries are not accepted because provider-to-service-category discovery is not yet modelled.
- Requests are rate-limited per Cloudflare client IP (10 requests per 15 minutes, instance-local).
- The request body is size-bounded and validated before database writes.
- The enquiry header, initial VISITOR message, and audit record are written in one database transaction.
- Public references are generated from cryptographically random bytes and retried on unique-reference collision.
- Audit metadata contains the enquiry type and product listing ID, not visitor contact details or message text.
- No access credential is created; no raw token, token hash, expiry, login, cookie, or visitor session is involved.

## Explicit exclusions

No provider inbox, visitor retrieval/reply endpoint, service enquiry, quotation, email/SMS notification, attachment, order, payment, booking, subscription, commission, production migration, or deployment.

## Operational notes

The in-memory rate limiter is best-effort abuse protection only. It resets on instance restart and is not shared across multiple instances. Cloudflare's `CF-Connecting-IP` is preferred; the leftmost `X-Forwarded-For` value is not trusted.

Phase 5A's `EnquiryAccessCredential` model/table and credential utility remain untouched and unused by this submission endpoint. They are not required for visitors to submit enquiries. No migration file is changed or applied.

## Validation before merge

Run the full test suite, lint, typecheck, Prisma validation/client generation, and production build. Review the pull request and CI results before considering a merge. Production migration and deployment require separate owner approval.
