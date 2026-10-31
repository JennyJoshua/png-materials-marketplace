-- Additive Phase 2 migration. Phase 1 SQL is intentionally frozen.
CREATE TYPE "ProviderKind" AS ENUM ('INDIVIDUAL','BUSINESS');
CREATE TYPE "ProviderType" AS ENUM ('PRODUCTS','SERVICES','BOTH');
CREATE TYPE "ProviderStatus" AS ENUM ('DRAFT','PENDING_REVIEW','ACTIVE','SUSPENDED');
CREATE TYPE "ProviderVerificationLevel" AS ENUM ('UNVERIFIED','CONTACT_CONFIRMED','DOCUMENTS_CHECKED');
CREATE TABLE "provider_profiles" (
"id" UUID NOT NULL, "user_id" UUID NOT NULL, "display_name" VARCHAR(120) NOT NULL,
"provider_kind" "ProviderKind" NOT NULL, "provider_type" "ProviderType" NOT NULL,
"description" VARCHAR(2000), "phone" VARCHAR(40), "public_email" VARCHAR(254), "address" VARCHAR(300),
"province" VARCHAR(100) NOT NULL, "district" VARCHAR(100), "town_or_area" VARCHAR(120),
"business_registration_number" VARCHAR(100), "website_url" VARCHAR(500), "logo_url" VARCHAR(500),
"delivery_available" BOOLEAN NOT NULL DEFAULT false, "pickup_available" BOOLEAN NOT NULL DEFAULT false,
"status" "ProviderStatus" NOT NULL DEFAULT 'DRAFT', "verification_level" "ProviderVerificationLevel" NOT NULL DEFAULT 'UNVERIFIED',
"verified_at" TIMESTAMPTZ(6), "verified_by_user_id" UUID,
"created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(6) NOT NULL,
CONSTRAINT "provider_profiles_pkey" PRIMARY KEY ("id"),
CONSTRAINT "provider_profiles_display_name_chk" CHECK (length(btrim("display_name")) BETWEEN 1 AND 120),
CONSTRAINT "provider_profiles_province_chk" CHECK (length(btrim("province")) BETWEEN 1 AND 100),
CONSTRAINT "provider_profiles_verification_actor_chk" CHECK (("verification_level" = 'UNVERIFIED' AND "verified_at" IS NULL AND "verified_by_user_id" IS NULL) OR ("verification_level" <> 'UNVERIFIED' AND "verified_at" IS NOT NULL AND "verified_by_user_id" IS NOT NULL)));
CREATE TABLE "service_categories" ("id" UUID NOT NULL, "name" VARCHAR(120) NOT NULL, "description" VARCHAR(500), "status" "CategoryStatus" NOT NULL DEFAULT 'ACTIVE', "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(6) NOT NULL, CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "provider_profiles_user_id_key" ON "provider_profiles"("user_id");
CREATE INDEX "provider_profiles_status_created_at_idx" ON "provider_profiles"("status","created_at");
CREATE INDEX "provider_profiles_verification_level_idx" ON "provider_profiles"("verification_level");
CREATE INDEX "provider_profiles_province_district_idx" ON "provider_profiles"("province","district");
CREATE INDEX "provider_profiles_display_name_idx" ON "provider_profiles"("display_name");
CREATE UNIQUE INDEX "service_categories_name_key" ON "service_categories"("name");
ALTER TABLE "provider_profiles" ADD CONSTRAINT "provider_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "provider_profiles" ADD CONSTRAINT "provider_profiles_verified_by_user_id_fkey" FOREIGN KEY ("verified_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "provider_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_categories" ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE r TEXT; BEGIN FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=r) THEN EXECUTE format('REVOKE ALL ON TABLE "provider_profiles", "service_categories" FROM %I',r); END IF; END LOOP; END $$;
