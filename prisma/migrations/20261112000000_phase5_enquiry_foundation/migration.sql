-- Phase 5A: enquiry data foundation.
-- Additive only. No existing records or production settings are modified by this file.
-- This migration is intentionally NOT applied to the live Supabase database in this task.

CREATE TYPE "EnquiryType" AS ENUM ('PRODUCT', 'SERVICE');
CREATE TYPE "EnquiryStatus" AS ENUM (
  'SUBMITTED',
  'VIEWED',
  'IN_DISCUSSION',
  'QUOTATION_SENT',
  'CLOSED',
  'DECLINED',
  'CANCELLED'
);
CREATE TYPE "EnquiryMessageSenderType" AS ENUM ('VISITOR', 'PROVIDER', 'SYSTEM');

-- Supports a composite FK that guarantees a product enquiry's selected listing belongs
-- to the same provider to whom the enquiry is routed.
CREATE UNIQUE INDEX "product_listings_id_provider_profile_id_key"
  ON "product_listings"("id", "provider_profile_id");

CREATE TABLE "enquiries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "public_reference" VARCHAR(24) NOT NULL,
  "type" "EnquiryType" NOT NULL,
  "provider_profile_id" UUID NOT NULL,
  "product_listing_id" UUID,
  "service_category_id" UUID,
  "visitor_name" VARCHAR(120) NOT NULL,
  "visitor_email" VARCHAR(254) NOT NULL,
  "visitor_phone" VARCHAR(40) NOT NULL,
  "subject" VARCHAR(160) NOT NULL,
  "summary" VARCHAR(4000) NOT NULL,
  "status" "EnquiryStatus" NOT NULL DEFAULT 'SUBMITTED',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_activity_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closed_at" TIMESTAMPTZ(6),
  CONSTRAINT "enquiries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "enquiries_public_reference_key" UNIQUE ("public_reference"),
  CONSTRAINT "enquiries_reference_nonempty_chk" CHECK (length(btrim("public_reference")) BETWEEN 6 AND 24),
  CONSTRAINT "enquiries_visitor_name_nonempty_chk" CHECK (length(btrim("visitor_name")) BETWEEN 1 AND 120),
  CONSTRAINT "enquiries_visitor_email_nonempty_chk" CHECK (length(btrim("visitor_email")) BETWEEN 3 AND 254),
  CONSTRAINT "enquiries_visitor_phone_nonempty_chk" CHECK (length(btrim("visitor_phone")) BETWEEN 3 AND 40),
  CONSTRAINT "enquiries_subject_nonempty_chk" CHECK (length(btrim("subject")) BETWEEN 1 AND 160),
  CONSTRAINT "enquiries_summary_nonempty_chk" CHECK (length(btrim("summary")) BETWEEN 1 AND 4000),
  CONSTRAINT "enquiries_target_type_chk" CHECK (
    ("type" = 'PRODUCT' AND "product_listing_id" IS NOT NULL AND "service_category_id" IS NULL)
    OR
    ("type" = 'SERVICE' AND "product_listing_id" IS NULL AND "service_category_id" IS NOT NULL)
  ),
  CONSTRAINT "enquiries_provider_profile_id_fkey"
    FOREIGN KEY ("provider_profile_id") REFERENCES "provider_profiles"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "enquiries_product_listing_provider_fkey"
    FOREIGN KEY ("product_listing_id", "provider_profile_id")
    REFERENCES "product_listings"("id", "provider_profile_id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "enquiries_service_category_id_fkey"
    FOREIGN KEY ("service_category_id") REFERENCES "service_categories"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "enquiries_provider_profile_id_status_last_activity_at_idx"
  ON "enquiries"("provider_profile_id", "status", "last_activity_at");
CREATE INDEX "enquiries_type_created_at_idx" ON "enquiries"("type", "created_at");
CREATE INDEX "enquiries_created_at_idx" ON "enquiries"("created_at");

CREATE TABLE "enquiry_messages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "enquiry_id" UUID NOT NULL,
  "sender_type" "EnquiryMessageSenderType" NOT NULL,
  "sender_user_id" UUID,
  "body" VARCHAR(4000) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "enquiry_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "enquiry_messages_body_nonempty_chk" CHECK (length(btrim("body")) BETWEEN 1 AND 4000),
  CONSTRAINT "enquiry_messages_sender_chk" CHECK (
    ("sender_type" = 'PROVIDER' AND "sender_user_id" IS NOT NULL)
    OR
    ("sender_type" IN ('VISITOR', 'SYSTEM') AND "sender_user_id" IS NULL)
  ),
  CONSTRAINT "enquiry_messages_enquiry_id_fkey"
    FOREIGN KEY ("enquiry_id") REFERENCES "enquiries"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "enquiry_messages_sender_user_id_fkey"
    FOREIGN KEY ("sender_user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "enquiry_messages_enquiry_id_created_at_idx"
  ON "enquiry_messages"("enquiry_id", "created_at");
CREATE INDEX "enquiry_messages_sender_user_id_idx"
  ON "enquiry_messages"("sender_user_id");

CREATE TABLE "enquiry_access_credentials" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "enquiry_id" UUID NOT NULL,
  "token_hash" CHAR(64) NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "revoked_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_used_at" TIMESTAMPTZ(6),
  CONSTRAINT "enquiry_access_credentials_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "enquiry_access_credentials_token_hash_key" UNIQUE ("token_hash"),
  CONSTRAINT "enquiry_access_credentials_hash_format_chk"
    CHECK ("token_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "enquiry_access_credentials_enquiry_id_fkey"
    FOREIGN KEY ("enquiry_id") REFERENCES "enquiries"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "enquiry_access_credentials_enquiry_id_expires_at_idx"
  ON "enquiry_access_credentials"("enquiry_id", "expires_at");

-- Server-Prisma-only tables: default deny through RLS and no client-role table grants.
ALTER TABLE "enquiries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "enquiry_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "enquiry_access_credentials" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "enquiries", "enquiry_messages", "enquiry_access_credentials" FROM PUBLIC;
DO $$
DECLARE
  r TEXT;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format(
        'REVOKE ALL ON TABLE "enquiries", "enquiry_messages", "enquiry_access_credentials" FROM %I',
        r
      );
    END IF;
  END LOOP;
END
$$;
