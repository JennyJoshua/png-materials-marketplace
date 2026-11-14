import { describe, expect, it } from "vitest";
import { productEnquiryInputSchema } from "../lib/validation/enquiries";

const valid = {
  productListingId: "d5f0d0e1-3bcb-4a75-ae87-4bb2b194b8f1",
  visitorName: "  Jane Buyer  ",
  visitorEmail: "  JANE@example.com ",
  visitorPhone: "+675 7000 0000",
  subject: " Price enquiry ",
  message: " Please send me a quotation. ",
};

describe("public product enquiry input", () => {
  it("trims input and normalises email without requiring a buyer account", () => {
    const result = productEnquiryInputSchema.parse(valid);
    expect(result.visitorName).toBe("Jane Buyer");
    expect(result.visitorEmail).toBe("jane@example.com");
    expect(result.subject).toBe("Price enquiry");
    expect(result.message).toBe("Please send me a quotation.");
  });

  it("rejects unknown fields, including a caller-supplied provider ID", () => {
    expect(productEnquiryInputSchema.safeParse({ ...valid, providerProfileId: "attacker" }).success).toBe(false);
  });

  it("requires valid contact information and non-empty content", () => {
    expect(productEnquiryInputSchema.safeParse({ ...valid, visitorEmail: "not-an-email" }).success).toBe(false);
    expect(productEnquiryInputSchema.safeParse({ ...valid, visitorPhone: "abc" }).success).toBe(false);
    expect(productEnquiryInputSchema.safeParse({ ...valid, message: "  " }).success).toBe(false);
  });

  it("enforces field limits", () => {
    expect(productEnquiryInputSchema.safeParse({ ...valid, visitorName: "x".repeat(121) }).success).toBe(false);
    expect(productEnquiryInputSchema.safeParse({ ...valid, message: "x".repeat(4001) }).success).toBe(false);
  });
});
