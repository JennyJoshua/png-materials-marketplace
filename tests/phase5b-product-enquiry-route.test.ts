import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  transaction: vi.fn(),
  create: vi.fn(),
  audit: vi.fn(),
  rateCheck: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    productListing: { findFirst: mocks.findFirst },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/security/audit", () => ({
  writeAuditLogOrThrow: mocks.audit,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  publicEnquiryLimiter: { check: mocks.rateCheck },
}));

import { POST } from "../app/api/enquiries/route";

const payload = {
  productListingId: "d5f0d0e1-3bcb-4a75-ae87-4bb2b194b8f1",
  visitorName: "Jane Buyer",
  visitorEmail: "jane@example.com",
  visitorPhone: "+675 7000 0000",
  subject: "Price enquiry",
  message: "Please send me a quotation.",
};

function request(body: unknown = payload) {
  return new Request("https://market.example/api/enquiries", {
    method: "POST",
    headers: {
      host: "market.example",
      origin: "https://market.example",
      "content-type": "application/json",
      "cf-connecting-ip": "203.0.113.20",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/enquiries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rateCheck.mockReturnValue({ allowed: true, remaining: 9, retryAfterSeconds: 900 });
    mocks.findFirst.mockResolvedValue({
      id: payload.productListingId,
      providerProfileId: "7f0a10f7-03ce-4d4a-95a8-10fb6e7c91e2",
      providerProfile: { id: "7f0a10f7-03ce-4d4a-95a8-10fb6e7c91e2", status: "ACTIVE", providerType: "PRODUCTS" },
      category: { status: "ACTIVE" },
    });
    mocks.create.mockResolvedValue({
      id: "5b17f27c-4c82-49d8-bab8-bfcbb01db2c3",
      publicReference: "ENQ-1234567890ABCDEF",
      status: "SUBMITTED",
      createdAt: new Date("2026-11-14T00:00:00.000Z"),
    });
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({ enquiry: { create: mocks.create } }),
    );
  });

  it("accepts a guest submission, derives its provider, and returns no access token", async () => {
    const response = await POST(request());
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.data.enquiry.reference).toBe("ENQ-1234567890ABCDEF");
    expect(json.data.enquiry.status).toBe("SUBMITTED");
    expect(JSON.stringify(json)).not.toMatch(/token|credential|password/i);
    expect(mocks.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: payload.productListingId }),
    }));
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        type: "PRODUCT",
        providerProfileId: "7f0a10f7-03ce-4d4a-95a8-10fb6e7c91e2",
        productListingId: payload.productListingId,
        messages: { create: { senderType: "VISITOR", body: payload.message } },
      }),
    }));
    expect(mocks.audit).toHaveBeenCalledOnce();
  });

  it("rejects caller-supplied provider identity", async () => {
    const response = await POST(request({ ...payload, providerProfileId: "attacker" }));
    expect(response.status).toBe(400);
    expect(mocks.findFirst).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("does not accept suspended or service-only providers", async () => {
    mocks.findFirst.mockResolvedValueOnce({
      id: payload.productListingId,
      providerProfileId: "7f0a10f7-03ce-4d4a-95a8-10fb6e7c91e2",
      providerProfile: { id: "7f0a10f7-03ce-4d4a-95a8-10fb6e7c91e2", status: "ACTIVE", providerType: "SERVICES" },
      category: { status: "ACTIVE" },
    });
    const response = await POST(request());
    expect(response.status).toBe(404);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects cross-origin requests before rate limiting or database access", async () => {
    const req = new Request("https://market.example/api/enquiries", {
      method: "POST",
      headers: { host: "market.example", origin: "https://attacker.example", "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const response = await POST(req);
    expect(response.status).toBe(403);
    expect(mocks.rateCheck).not.toHaveBeenCalled();
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });

  it("returns a retry delay when the public rate limit is exceeded", async () => {
    mocks.rateCheck.mockReturnValueOnce({ allowed: false, remaining: 0, retryAfterSeconds: 120 });
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("120");
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });
});
