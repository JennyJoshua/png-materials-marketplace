import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync(
  "prisma/migrations/20261101090000_phase3_product_listings/migration.sql",
  "utf8",
);

describe("Phase 3 product listing database foundation", () => {
  it("models provider-owned listings with exact decimal PGK prices and explicit states", () => {
    expect(schema).toContain("model ProductListing");
    expect(schema).toContain("price          Decimal");
    expect(schema).toContain("@db.Decimal(12, 2)");
    expect(schema).toContain("enum ProductStockStatus");
    expect(schema).toContain("enum ProductListingStatus");
    expect(schema).toContain("providerProfile ProviderProfile");
    expect(schema).toContain("category        ProductCategory");
  });

  it("preserves listings when a provider or category is deleted", () => {
    expect(schema).toContain("onDelete: Restrict");
    expect(migration).toContain('ON DELETE RESTRICT');
    expect(migration).not.toMatch(/ON DELETE CASCADE/i);
  });

  it("enforces positive prices and non-empty names and units in PostgreSQL", () => {
    expect(migration).toContain('"product_listings_price_positive" CHECK ("price" > 0)');
    expect(migration).toContain('"product_listings_name_nonempty"');
    expect(migration).toContain('"product_listings_unit_nonempty"');
  });

  it("enables RLS without creating public policies and revokes public API roles", () => {
    expect(migration).toContain('ALTER TABLE "product_listings" ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain("REVOKE ALL ON TABLE \"product_listings\" FROM PUBLIC, anon, authenticated");
    expect(migration).not.toMatch(/CREATE POLICY/i);
  });

  it("uses server-managed timestamps and indexes the principal browse filters", () => {
    expect(migration).toContain('"price_updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP');
    expect(migration).toContain('"stock_updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP');
    expect(migration).toContain('"product_listings_category_id_listing_status_idx"');
    expect(migration).toContain('"product_listings_listing_status_updated_at_idx"');
  });
});
