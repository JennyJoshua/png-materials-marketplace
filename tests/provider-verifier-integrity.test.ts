import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync(
  "prisma/migrations/20261101000000_provider_verifier_integrity/migration.sql",
  "utf8",
);

describe("provider verifier referential integrity", () => {
  it("keeps the verifying administrator while a verification attribution exists", () => {
    expect(schema).toMatch(
      /verifiedBy User\? @relation\("ProviderVerifier", fields: \[verifiedByUserId\], references: \[id\], onDelete: Restrict\)/,
    );
    expect(migration).toContain('ON DELETE RESTRICT');
    expect(migration).not.toMatch(/verified_by_user_id[\s\S]*?ON DELETE SET NULL/i);
  });

  it("indexes the verifier foreign key in Prisma and PostgreSQL", () => {
    expect(schema).toContain("@@index([verifiedByUserId])");
    expect(migration).toContain(
      'CREATE INDEX "provider_profiles_verified_by_user_id_idx"',
    );
    expect(migration).toContain('ON "provider_profiles"("verified_by_user_id")');
  });

  it("replaces the existing foreign key without changing provider verification values", () => {
    expect(migration).toContain(
      'DROP CONSTRAINT "provider_profiles_verified_by_user_id_fkey"',
    );
    expect(migration).toContain(
      'ADD CONSTRAINT "provider_profiles_verified_by_user_id_fkey"',
    );
    expect(migration).not.toMatch(/UPDATE\s+"provider_profiles"/i);
    expect(migration).not.toMatch(/DELETE\s+FROM\s+"provider_profiles"/i);
  });
});
