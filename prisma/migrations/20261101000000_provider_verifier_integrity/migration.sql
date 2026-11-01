-- Preserve verification attribution: an administrator who verified a provider
-- cannot be deleted while that attribution is in use. Unverify or reassign first.
ALTER TABLE "provider_profiles"
  DROP CONSTRAINT "provider_profiles_verified_by_user_id_fkey";

ALTER TABLE "provider_profiles"
  ADD CONSTRAINT "provider_profiles_verified_by_user_id_fkey"
  FOREIGN KEY ("verified_by_user_id")
  REFERENCES "users"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- Support lookups and referential checks for the verifier foreign key.
CREATE INDEX "provider_profiles_verified_by_user_id_idx"
  ON "provider_profiles"("verified_by_user_id");
