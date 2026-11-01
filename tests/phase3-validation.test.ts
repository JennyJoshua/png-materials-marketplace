import { describe, expect, it } from "vitest";
import {
  productCategoryInputSchema,
  productCategoryPatchSchema,
  productListingInputSchema,
  productListingPatchSchema,
  productModerationSchema,
} from "@/lib/validation/products";

const validListing = {
  categoryId: "11111111-1111-4111-8111-111111111111",
  name: "Portland cement",
  unit: "bag",
  price: "45.50",
  stockStatus: "IN_STOCK",
};

describe("Phase 3 request validation", () => {
  it("accepts a valid provider listing with decimal currency as a string", () => {
    expect(productListingInputSchema.safeParse(validListing).success).toBe(true);
  });
  it("rejects zero, negative, exponent and over-precision prices", () => {
    for (const price of ["0", "-1", "1e3", "1.999", "10000000000.00"]) {
      expect(productListingInputSchema.safeParse({ ...validListing, price }).success).toBe(false);
    }
  });
  it("rejects unexpected client-controlled fields", () => {
    expect(productListingInputSchema.safeParse({ ...validListing, providerProfileId: "client-controlled" }).success).toBe(false);
    expect(productListingPatchSchema.safeParse({ listingStatus: "ACTIVE" }).success).toBe(false);
  });
  it("requires at least one editable listing field", () => {
    expect(productListingPatchSchema.safeParse({}).success).toBe(false);
    expect(productListingPatchSchema.safeParse({ name: "Cement" }).success).toBe(true);
  });
  it("validates category creation and partial updates", () => {
    expect(productCategoryInputSchema.safeParse({ name: "Timber" }).success).toBe(true);
    expect(productCategoryPatchSchema.safeParse({ status: "INACTIVE" }).success).toBe(true);
    expect(productCategoryPatchSchema.safeParse({}).success).toBe(false);
  });
  it("requires an administrator moderation reason", () => {
    expect(productModerationSchema.safeParse({ status: "SUSPENDED", reason: "Duplicate listing" }).success).toBe(true);
    expect(productModerationSchema.safeParse({ status: "ACTIVE" }).success).toBe(false);
  });
});
