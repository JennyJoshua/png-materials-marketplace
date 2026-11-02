import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("Phase 4 marketplace interface", () => {
  it("adds catalogue, detail and provider pages", () => {
    expect(existsSync("app/products/page.tsx")).toBe(true);
    expect(existsSync("app/products/[id]/page.tsx")).toBe(true);
    expect(existsSync("app/provider/products/page.tsx")).toBe(true);
  });

  it("uses the public APIs rather than exposing database access to browsers", () => {
    const source = read("components/ProductBrowser.tsx");
    expect(source).toContain("/api/products?");
    expect(source).toContain("/api/categories");
    expect(source).not.toContain("DATABASE_URL");
  });

  it("limits product details to the existing public listing visibility rules", () => {
    expect(read("app/products/[id]/page.tsx")).toContain("publicListingWhere()");
  });

  it("uses provider-scoped listing lifecycle APIs", () => {
    const source = read("components/ProviderProducts.tsx");
    for (const action of ["publish", "unpublish", "archive", "/api/providers/products"]) {
      expect(source).toContain(action);
    }
  });

  it("clears applied catalogue filters using explicit empty values", () => {
    expect(read("components/ProductBrowser.tsx")).toContain(
      'load(1, { q: "", cat: "", province: "", stock: "", sort: "newest" })',
    );
  });

  it("prevents duplicate provider listing submissions", () => {
    const source = read("components/ProviderProducts.tsx");
    expect(source).toContain("if (saving) return");
    expect(source).toContain("disabled={!categories.length || saving}");
  });

  it("does not overstate supplier verification", () => {
    const source = read("app/products/[id]/page.tsx");
    expect(source).toContain('verificationLevel === "DOCUMENTS_CHECKED"');
    expect(source).toContain('verificationLevel === "CONTACT_CONFIRMED"');
  });

  it("provides accessible catalogue and listing controls", () => {
    const browser = read("components/ProductBrowser.tsx");
    const provider = read("components/ProviderProducts.tsx");
    expect(browser).toContain('aria-label="Product pages"');
    expect(browser).toContain("aria-busy={busy}");
    expect(provider).toContain('aria-label={"Edit " + listing.name}');
  });

  it("does not expose a provider street address on public product details", () => {
    const source = read("app/products/[id]/page.tsx");
    expect(source).not.toContain("address: true");
    expect(source).not.toContain("providerProfile.address");
  });

  it("does not add checkout, payment processing or uploads", () => {
    const source = [
      "components/ProductBrowser.tsx",
      "components/ProviderProducts.tsx",
      "app/products/[id]/page.tsx",
    ]
      .map(read)
      .join("\n");
    expect(source).not.toMatch(/checkout|paymentIntent|upload\(/i);
  });
});
