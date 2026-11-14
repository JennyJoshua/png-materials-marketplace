import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  access: vi.fn(), provider: vi.fn(), count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(),
  updateMany: vi.fn(), transaction: vi.fn(), audit: vi.fn(),
}));

vi.mock("@/lib/auth/guards", () => ({ requireApiAccess: mocks.access }));
vi.mock("@/lib/auth/provider-access", () => ({ getOwnedActiveProvider: mocks.provider }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    enquiry: { count: mocks.count, findMany: mocks.findMany, findFirst: mocks.findFirst },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/security/audit", () => ({ writeAuditLogOrThrow: mocks.audit }));

import { GET as listEnquiries } from "@/app/api/providers/enquiries/route";
import { GET as getEnquiry, PATCH as patchEnquiry } from "@/app/api/providers/enquiries/[id]/route";

const user = { id: "owner-1", status: "ACTIVE", role: "SUPPLIER", email: "owner@example.test", fullName: "Owner", phone: null, createdAt: new Date() };
const provider = { id: "provider-1", userId: user.id, status: "ACTIVE", providerType: "PRODUCTS" };
const enquiry = {
  id: "11111111-1111-4111-8111-111111111111", publicReference: "ENQ-1234567890ABCDEF",
  status: "SUBMITTED", subject: "Price enquiry",
};

function req(url = "https://app.test/api/providers/enquiries", method = "GET", body?: unknown) {
  return new Request(url, {
    method,
    headers: { host: "app.test", origin: "https://app.test", ...(body === undefined ? {} : { "content-type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const context = { params: Promise.resolve({ id: enquiry.id }) };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.access.mockResolvedValue({ user });
  mocks.provider.mockResolvedValue(provider);
  mocks.count.mockResolvedValue(1);
  mocks.findMany.mockResolvedValue([enquiry]);
  mocks.findFirst.mockResolvedValue(enquiry);
  mocks.updateMany.mockResolvedValue({ count: 1 });
  mocks.transaction.mockImplementation(async (arg: unknown) => {
    if (Array.isArray(arg)) return Promise.all(arg);
    return (arg as (tx: unknown) => unknown)({
      enquiry: { findFirst: mocks.findFirst, updateMany: mocks.updateMany },
    });
  });
});

describe("Phase 5C provider enquiry APIs", () => {
  it("rejects unauthenticated providers before querying enquiries", async () => {
    mocks.access.mockResolvedValue({ response: NextResponse.json({}, { status: 401 }) });
    const response = await listEnquiries(req());
    expect(response.status).toBe(401);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("requires an active user and active owned provider profile", async () => {
    mocks.provider.mockResolvedValue(null);
    const response = await listEnquiries(req());
    expect(response.status).toBe(403);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("bounds pagination and scopes every list query to the authenticated provider", async () => {
    const response = await listEnquiries(req("https://app.test/api/providers/enquiries?page=2&pageSize=10&status=SUBMITTED&q=price"));
    expect(response.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ providerProfileId: provider.id, type: "PRODUCT", status: "SUBMITTED" }),
      skip: 10, take: 10,
    }));
  });

  it("rejects invalid pagination and status filters", async () => {
    expect((await listEnquiries(req("https://app.test/api/providers/enquiries?page=0"))).status).toBe(400);
    expect((await listEnquiries(req("https://app.test/api/providers/enquiries?status=MADE_UP"))).status).toBe(400);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("returns a non-disclosing not-found response for another provider's enquiry", async () => {
    mocks.findFirst.mockResolvedValue(null);
    const response = await getEnquiry(req("https://app.test/api/providers/enquiries/" + enquiry.id), context);
    expect(response.status).toBe(404);
  });

  it("does not select visitor contacts or message content in the inbox list", async () => {
    await listEnquiries(req());
    const select = mocks.findMany.mock.calls[0]![0].select;
    expect(select).not.toHaveProperty("visitorEmail");
    expect(select).not.toHaveProperty("visitorPhone");
    expect(select).not.toHaveProperty("summary");
    expect(select).not.toHaveProperty("messages");
  });

  it("rejects invalid status transitions and does not write an audit event", async () => {
    const response = await patchEnquiry(req("https://app.test/api/providers/enquiries/" + enquiry.id, "PATCH", { status: "IN_DISCUSSION" }), context);
    expect(response.status).toBe(409);
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("updates an allowed status and audits only the status values", async () => {
    const response = await patchEnquiry(req("https://app.test/api/providers/enquiries/" + enquiry.id, "PATCH", { status: "VIEWED" }), context);
    expect(response.status).toBe(200);
    expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: enquiry.id, providerProfileId: provider.id, type: "PRODUCT", status: "SUBMITTED" },
      data: expect.objectContaining({ status: "VIEWED", lastActivityAt: expect.any(Date) }),
    }));
    expect(mocks.audit).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      action: "ENQUIRY_STATUS_CHANGED",
      metadata: { previousStatus: "SUBMITTED", status: "VIEWED" },
    }));
  });

  it("rejects cross-origin status changes before auth or database access", async () => {
    const request = new Request("https://app.test/api/providers/enquiries/" + enquiry.id, {
      method: "PATCH", headers: { host: "app.test", origin: "https://attacker.test", "content-type": "application/json" },
      body: JSON.stringify({ status: "VIEWED" }),
    });
    const response = await patchEnquiry(request, context);
    expect(response.status).toBe(403);
    expect(mocks.access).not.toHaveBeenCalled();
  });
});
