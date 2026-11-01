-- Phase 3: provider-owned product listings.
-- Additive only. No legacy tables or existing records are modified.
CREATE TYPE "ProductStockStatus" AS ENUM (
  'IN_STOCK',
  'LIMITED_STOCK',
  'OUT_OF_STOCK',
  'CONTACT_SUPPLIER'
);

CREATE TYPE "ProductListingStatus" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'SUSPENDED',
  'ARCHIVED'
);

CREATE TABLE "product_listings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "provider_profile_id" UUID NOT NULL,
  "category_id" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "brand" VARCHAR(120),
  "specification" VARCHAR(500),
  "description" TEXT,
  "unit" VARCHAR(40) NOT NULL,
  "price" NUMERIC(12,2) NOT NULL,
  "stock_status" "ProductStockStatus" NOT NULL DEFAULT 'CONTACT_SUPPLIER',
  "listing_status" "ProductListingStatus" NOT NULL DEFAULT 'DRAFT',
  "price_updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "stock_updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_listings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_listings_price_positive" CHECK ("price" > 0),
  CONSTRAINT "product_listings_name_nonempty" CHECK (length(btrim("name")) > 0),
  CONSTRAINT "product_listings_unit_nonempty" CHECK (length(btrim("unit")) > 0),
  CONSTRAINT "product_listings_provider_profile_id_fkey"
    FOREIGN KEY ("provider_profile_id") REFERENCES "provider_profiles"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "product_listings_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "product_categories"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "product_listings_provider_profile_id_listing_status_idx"
  ON "product_listings"("provider_profile_id", "listing_status");
CREATE INDEX "product_listings_category_id_listing_status_idx"
  ON "product_listings"("category_id", "listing_status");
CREATE INDEX "product_listings_listing_status_updated_at_idx"
  ON "product_listings"("listing_status", "updated_at");
CREATE INDEX "product_listings_price_idx" ON "product_listings"("price");
CREATE INDEX "product_listings_name_idx" ON "product_listings"("name");

-- Public Supabase roles must not access this server-Prisma-only table directly.
ALTER TABLE "product_listings" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "product_listings" FROM anon, authenticated;
