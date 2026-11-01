import { describe, expect, it } from "vitest";
import { sameOriginError } from "@/lib/security/http";
import { sanitizeMetadata } from "@/lib/security/audit";
import { publicListingWhere } from "@/lib/products/queries";

describe("Phase 3 security boundaries", () => {
  it("accepts a same-origin browser mutation", () => {
    const request = new Request("https://marketplace.test/api/provider/products", {
      method: "POST",
      headers: { host: "marketplace.test", origin: "https://marketplace.test" },
    });
    expect(sameOriginError(request)).toBeNull();
  });

  it("rejects a cross-origin mutation", () => {
    const request = new Request("https://marketplace.test/api/provider/products", {
      method: "POST",
      headers: { host: "marketplace.test", origin: "https://attacker.test" },
    });
    expect(sameOriginError(request)?.status).toBe(403);
  });

  it("does not let missing browser-origin evidence pass", () => {
    const request = new Request("https://marketplace.test/api/provider/products", { method: "POST" });
    expect(sameOriginError(request)?.status).toBe(403);
  });

  it("removes credential-like audit metadata keys", () => {
    expect(sanitizeMetadata({ listingName: "Cement", accessToken: "secret", password: "secret", reason: "Duplicate" }))
      .toEqual({ listingName: "Cement", reason: "Duplicate" });
  });

  it("restricts public listing visibility to active provider and category", () => {
    expect(publicListingWhere()).toEqual({
      listingStatus: "ACTIVE",
      category: { status: "ACTIVE" },
      providerProfile: { status: "ACTIVE", providerType: { in: ["PRODUCTS", "BOTH"] } },
    });
  });
});
