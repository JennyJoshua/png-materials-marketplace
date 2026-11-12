import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createEnquiryAccessCredential,
  hashEnquiryAccessToken,
  isValidEnquiryAccessToken,
  verifyEnquiryAccessToken,
} from "../lib/enquiries/access-credential";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync(
  "prisma/migrations/20261112000000_phase5_enquiry_foundation/migration.sql",
  "utf8",
);

describe("Phase 5A enquiry foundation", () => {
  it("generates a 256-bit URL-safe token and stores only its digest", () => {
    const first = createEnquiryAccessCredential();
    const second = createEnquiryAccessCredential();

    expect(isValidEnquiryAccessToken(first.token)).toBe(true);
    expect(Buffer.from(first.token, "base64url")).toHaveLength(32);
    expect(first.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(first.tokenHash).not.toContain(first.token);
    expect(second.token).not.toBe(first.token);
    expect(second.tokenHash).not.toBe(first.tokenHash);
  });

  it("hashes and verifies valid tokens, rejecting mismatches and malformed input", () => {
    const credential = createEnquiryAccessCredential();

    expect(hashEnquiryAccessToken(credential.token)).toBe(credential.tokenHash);
    expect(verifyEnquiryAccessToken(credential.token, credential.tokenHash)).toBe(true);
    expect(verifyEnquiryAccessToken("wrong-token", credential.tokenHash)).toBe(false);
    expect(verifyEnquiryAccessToken(credential.token, "not-a-hash")).toBe(false);
    expect(isValidEnquiryAccessToken("")).toBe(false);
    expect(() => hashEnquiryAccessToken("invalid")).toThrow(
      "Invalid enquiry access token format",
    );
  });

  it("models one-provider enquiries and both product and service targets", () => {
    expect(schema).toContain("enum EnquiryType");
    expect(schema).toContain("enum EnquiryStatus");
    expect(schema).toContain("model Enquiry");
    expect(schema).toContain("providerProfileId String       @map(\"provider_profile_id\") @db.Uuid");
    expect(schema).toContain("productListing  ProductListing?");
    expect(schema).toContain("serviceCategory ServiceCategory?");
    expect(schema).toContain("visitorEmail      String       @map(\"visitor_email\")");
    expect(schema).toContain("visitorPhone      String       @map(\"visitor_phone\")");
  });

  it("ties a product enquiry to the same provider as its selected listing", () => {
    expect(schema).toContain("@@unique([id, providerProfileId])");
    expect(migration).toContain(
      'FOREIGN KEY ("product_listing_id", "provider_profile_id")',
    );
    expect(migration).toContain(
      'REFERENCES "product_listings"("id", "provider_profile_id")',
    );
  });

  it("keeps raw visitor credentials out of the database schema and migration", () => {
    expect(schema).toContain('tokenHash  String    @unique @map("token_hash")');
    expect(schema).not.toMatch(/\brawToken\b|\baccessToken\b/i);
    expect(migration).toContain('"token_hash" CHAR(64) NOT NULL');
    expect(migration).not.toMatch(/"token"\s+TEXT|"raw_token"/i);
  });

  it("enables RLS and revokes client-role access without adding policies", () => {
    expect(migration).toContain('ALTER TABLE "enquiries" ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('ALTER TABLE "enquiry_messages" ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('ALTER TABLE "enquiry_access_credentials" ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('FROM PUBLIC');
    expect(migration).toContain("'anon', 'authenticated'");
    expect(migration).not.toMatch(/CREATE\s+POLICY/i);
  });

  it("enforces enquiry target shape and sender identity shape in PostgreSQL", () => {
    expect(migration).toContain('"enquiries_target_type_chk"');
    expect(migration).toContain('"enquiry_messages_sender_chk"');
    expect(migration).toContain('ON DELETE RESTRICT');
  });
});
