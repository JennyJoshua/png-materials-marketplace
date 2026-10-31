import { afterEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  access: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(),
  findMany: vi.fn(), audit: vi.fn(), transaction: vi.fn(),
}));
const tx = {
  providerProfile: {
    findUnique: mocks.findUnique,
    create: mocks.create,
    update: mocks.update,
  },
  auditLog: { create: mocks.audit },
};
vi.mock("@/lib/auth/guards", () => ({ requireApiAccess: mocks.access }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    providerProfile: { findUnique: mocks.findUnique, create: mocks.create, update: mocks.update, findMany: mocks.findMany },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/security/audit", () => ({ writeAuditLogOrThrow: mocks.audit }));
import { GET as ownerGet, POST as ownerPost, PATCH as ownerPatch } from "@/app/api/providers/me/route";
import { GET as adminGet, PATCH as adminPatch } from "@/app/api/admin/providers/route";

const user = { id: "owner-1", status: "ACTIVE", role: "CUSTOMER", email: "private@example.test", fullName: "Owner", phone: null, createdAt: new Date() };
const payload = { displayName: "Test Provider", providerKind: "INDIVIDUAL", providerType: "SERVICES", province: "Gulf", deliveryAvailable: false, pickupAvailable: false };
const req = (body: unknown) => new Request("https://example.test/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

afterEach(() => {
  vi.clearAllMocks();
  mocks.transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx));
});

describe("provider owner API", () => {
  it("denies signed-out callers before reading data", async () => {
    mocks.access.mockResolvedValue({ response: NextResponse.json({ error: "unauthenticated" }, { status: 401 }) });
    const r = await ownerGet();
    expect(r.status).toBe(401);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
  it("creates a pending, unverified profile and atomically records its audit event", async () => {
    mocks.access.mockResolvedValue({ user });
    mocks.create.mockResolvedValue({ id: "p1", status: "PENDING_REVIEW", providerKind: "INDIVIDUAL", providerType: "SERVICES" });
    const r = await ownerPost(req(payload));
    expect(r.status).toBe(201);
    const args = mocks.create.mock.calls[0]![0];
    expect(args.data.userId).toBe("owner-1");
    expect(args.data.status).toBe("PENDING_REVIEW");
    expect(args.data).not.toHaveProperty("role");
    expect(args.data).not.toHaveProperty("verificationLevel");
    expect(mocks.audit).toHaveBeenCalledOnce();
    expect(mocks.transaction).toHaveBeenCalledOnce();
  });
  it("rejects attempts to elevate role or claim verification", async () => {
    mocks.access.mockResolvedValue({ user });
    const r = await ownerPost(req({ ...payload, role: "ADMIN", verificationLevel: "DOCUMENTS_CHECKED" }));
    expect(r.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("reads only the authenticated owner's profile", async () => {
    mocks.access.mockResolvedValue({ user });
    mocks.findUnique.mockResolvedValue(null);
    await ownerGet();
    expect(mocks.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "owner-1" } }));
  });
  it("moves active profile edits back to pending review and atomically audits the edit", async () => {
    mocks.access.mockResolvedValue({ user });
    mocks.findUnique.mockResolvedValue({ id: "p1", status: "ACTIVE" });
    mocks.update.mockResolvedValue({ id: "p1", status: "PENDING_REVIEW" });
    const r = await ownerPatch(req(payload));
    expect(r.status).toBe(200);
    expect(mocks.update.mock.calls[0]![0].data.status).toBe("PENDING_REVIEW");
    expect(mocks.audit).toHaveBeenCalledOnce();
    expect(mocks.transaction).toHaveBeenCalledOnce();
  });
  it("blocks edits to suspended provider profiles", async () => {
    mocks.access.mockResolvedValue({ user });
    mocks.findUnique.mockResolvedValue({ id: "p1", status: "SUSPENDED" });
    const r = await ownerPatch(req(payload));
    expect(r.status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("rolls back owner edits when audit insertion fails", async () => {
    mocks.access.mockResolvedValue({ user });
    mocks.findUnique.mockResolvedValue({ id: "p1", status: "ACTIVE" });
    mocks.update.mockResolvedValue({ id: "p1", status: "PENDING_REVIEW" });
    mocks.audit.mockRejectedValueOnce(new Error("audit unavailable"));
    await expect(ownerPatch(req(payload))).rejects.toThrow("audit unavailable");
  });
});

describe("provider administrator API", () => {
  it("denies non-admin callers", async () => {
    mocks.access.mockResolvedValue({ response: NextResponse.json({ error: "forbidden" }, { status: 403 }) });
    const r = await adminGet();
    expect(r.status).toBe(403);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
  it("prevents an administrator from reviewing their own provider profile", async () => {
    mocks.access.mockResolvedValue({ user: { ...user, id: "admin-1", role: "ADMIN" } });
    mocks.findUnique.mockResolvedValue({ id: "p1", userId: "admin-1", status: "ACTIVE", verificationLevel: "UNVERIFIED" });
    const r = await adminPatch(req({ providerId: "123e4567-e89b-12d3-a456-426614174000", status: "SUSPENDED" }));
    expect(r.status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("records status and verification changes in the same transaction as the update", async () => {
    mocks.access.mockResolvedValue({ user: { ...user, id: "admin-1", role: "ADMIN" } });
    mocks.findUnique.mockResolvedValue({ id: "p1", userId: "owner-1", status: "PENDING_REVIEW", verificationLevel: "UNVERIFIED" });
    mocks.update.mockResolvedValue({ id: "p1", status: "ACTIVE", verificationLevel: "CONTACT_CONFIRMED" });
    const r = await adminPatch(req({ providerId: "123e4567-e89b-12d3-a456-426614174000", status: "ACTIVE", verificationLevel: "CONTACT_CONFIRMED" }));
    expect(r.status).toBe(200);
    expect(mocks.update.mock.calls[0]![0].data.verifiedByUserId).toBe("admin-1");
    expect(mocks.audit).toHaveBeenCalledTimes(2);
    expect(mocks.transaction).toHaveBeenCalledOnce();
  });
  it("rolls back administrator changes when audit insertion fails", async () => {
    mocks.access.mockResolvedValue({ user: { ...user, id: "admin-1", role: "ADMIN" } });
    mocks.findUnique.mockResolvedValue({ id: "p1", userId: "owner-1", status: "PENDING_REVIEW", verificationLevel: "UNVERIFIED" });
    mocks.update.mockResolvedValue({ id: "p1", status: "ACTIVE", verificationLevel: "CONTACT_CONFIRMED" });
    mocks.audit.mockRejectedValueOnce(new Error("audit unavailable"));
    await expect(adminPatch(req({ providerId: "123e4567-e89b-12d3-a456-426614174000", status: "ACTIVE" }))).rejects.toThrow("audit unavailable");
  });
});
