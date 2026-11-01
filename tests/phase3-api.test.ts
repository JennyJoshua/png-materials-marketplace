import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const m = vi.hoisted(() => ({
  access: vi.fn(), providerFindUnique: vi.fn(), categoryFindFirst: vi.fn(),
  listingFindMany: vi.fn(), listingFindFirst: vi.fn(), listingCreate: vi.fn(),
  listingUpdateMany: vi.fn(), listingFindUnique: vi.fn(), categoryFindMany: vi.fn(),
  audit: vi.fn(), transaction: vi.fn(),
}));

const tx = {
  productListing: {
    create: m.listingCreate,
    updateMany: m.listingUpdateMany,
    findUnique: m.listingFindUnique,
  },
};

vi.mock("@/lib/auth/guards", () => ({ requireApiAccess: m.access }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    providerProfile: { findUnique: m.providerFindUnique },
    productCategory: { findFirst: m.categoryFindFirst, findMany: m.categoryFindMany },
    productListing: {
      findMany: m.listingFindMany, findFirst: m.listingFindFirst,
      create: m.listingCreate, updateMany: m.listingUpdateMany, findUnique: m.listingFindUnique,
    },
    $transaction: m.transaction,
  },
}));
vi.mock("@/lib/security/audit", () => ({ writeAuditLogOrThrow: m.audit }));

import { POST as providerCreate } from "@/app/api/provider/products/route";
import { PATCH as providerPatch } from "@/app/api/provider/products/[id]/route";
import { GET as adminCategories } from "@/app/api/admin/categories/route";
import { GET as publicCategories } from "@/app/api/categories/route";

const user = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "owner@example.test", fullName: "Owner", phone: null,
  role: "CUSTOMER", status: "ACTIVE" as const, createdAt: new Date(),
};
const provider = { id: "22222222-2222-4222-8222-222222222222", userId: user.id, status: "ACTIVE", providerType: "PRODUCTS" };
const valid = {
  categoryId: "33333333-3333-4333-8333-333333333333",
  name: "Portland cement", unit: "bag", price: "45.50", stockStatus: "IN_STOCK",
};
const request = (body: unknown, origin = "https://marketplace.test") =>
  new Request("https://marketplace.test/api/provider/products", {
    method: "POST",
    headers: { host: "marketplace.test", origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  m.transaction.mockImplementation(async (operation: (client: typeof tx) => unknown) => operation(tx));
  m.access.mockResolvedValue({ user });
  m.providerFindUnique.mockResolvedValue(provider);
  m.categoryFindFirst.mockResolvedValue({ id: valid.categoryId });
  m.listingCreate.mockResolvedValue({ id: "listing-1", name: valid.name, price: "45.50", stockStatus: "IN_STOCK", listingStatus: "DRAFT", createdAt: new Date() });
});

describe("Phase 3 provider listing APIs", () => {
  it("derives provider ownership from the authenticated user and creates a draft", async () => {
    const response = await providerCreate(request(valid));
    expect(response.status).toBe(201);
    expect(m.providerFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: user.id } }));
    expect(m.listingCreate.mock.calls[0]![0].data.providerProfileId).toBe(provider.id);
    expect(m.listingCreate.mock.calls[0]![0].data.listingStatus).toBeUndefined();
    expect(m.audit).toHaveBeenCalledOnce();
  });

  it("rejects a client-supplied provider ID instead of trusting it", async () => {
    const response = await providerCreate(request({ ...valid, providerProfileId: "99999999-9999-4999-8999-999999999999" }));
    expect(response.status).toBe(400);
    expect(m.listingCreate).not.toHaveBeenCalled();
  });

  it("rejects a cross-origin provider mutation", async () => {
    const response = await providerCreate(request(valid, "https://attacker.test"));
    expect(response.status).toBe(403);
    expect(m.access).not.toHaveBeenCalled();
    expect(m.listingCreate).not.toHaveBeenCalled();
  });

  it("does not let a provider edit a listing owned by someone else", async () => {
    m.listingFindFirst.mockResolvedValue(null);
    const response = await providerPatch(
      new Request("https://marketplace.test/api/provider/products/listing-foreign", {
        method: "PATCH",
        headers: { host: "marketplace.test", origin: "https://marketplace.test", "content-type": "application/json" },
        body: JSON.stringify({ name: "Hijacked listing" }),
      }),
      { params: Promise.resolve({ id: "44444444-4444-4444-8444-444444444444" }) },
    );
    expect(response.status).toBe(404);
    expect(m.listingUpdateMany).not.toHaveBeenCalled();
  });

  it("does not allow a SERVICES-only provider to create product listings", async () => {
    m.providerFindUnique.mockResolvedValue({ ...provider, providerType: "SERVICES" });
    const response = await providerCreate(request(valid));
    expect(response.status).toBe(403);
    expect(m.listingCreate).not.toHaveBeenCalled();
  });
});

describe("Phase 3 administrator category access", () => {
  it("denies non-administrators before reading categories", async () => {
    m.access.mockResolvedValue({ response: NextResponse.json({ success: false }, { status: 403 }) });
    const response = await adminCategories();
    expect(response.status).toBe(403);
    expect(m.categoryFindMany).not.toHaveBeenCalled();
  });
});

describe("Phase 3 public category API", () => {
  it("returns only active category fields for public browse filters", async () => {
    m.categoryFindMany.mockResolvedValue([{ id: "category-1", name: "Cement", description: null }]);
    const response = await publicCategories();
    expect(response.status).toBe(200);
    expect(m.categoryFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, description: true },
    }));
    expect(m.access).not.toHaveBeenCalled();
  });
});
