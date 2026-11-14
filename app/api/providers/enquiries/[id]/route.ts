import { EnquiryStatus } from "@prisma/client";
import { requireApiAccess } from "@/lib/auth/guards";
import { getOwnedActiveProvider } from "@/lib/auth/provider-access";
import { prisma } from "@/lib/db/prisma";
import { jsonError, jsonOk, readJson, sameOriginError } from "@/lib/security/http";
import { logServerError } from "@/lib/security/log";
import { writeAuditLogOrThrow } from "@/lib/security/audit";
import { z } from "zod";

const statusInputSchema = z.object({
  status: z.enum(["VIEWED", "IN_DISCUSSION", "CLOSED", "DECLINED"]),
}).strict();

const allowedTransitions: Record<EnquiryStatus, readonly EnquiryStatus[]> = {
  SUBMITTED: ["VIEWED", "CLOSED", "DECLINED"],
  VIEWED: ["IN_DISCUSSION", "CLOSED", "DECLINED"],
  IN_DISCUSSION: ["CLOSED", "DECLINED"],
  QUOTATION_SENT: [],
  CLOSED: [],
  DECLINED: [],
  CANCELLED: [],
};

function validId(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiAccess(["SUPPLIER"]);
  if (response) return response;
  if (user.status !== "ACTIVE") return jsonError(403, "ACCOUNT_NOT_ACTIVE", "Your account must be active to access enquiries.");
  const provider = await getOwnedActiveProvider(user);
  if (!provider) return jsonError(403, "ACTIVE_PROVIDER_REQUIRED", "An active provider profile is required.");

  const { id } = await context.params;
  if (!validId(id)) return jsonError(404, "ENQUIRY_NOT_FOUND", "Enquiry not found.");

  try {
    const enquiry = await prisma.enquiry.findFirst({
      where: { id, providerProfileId: provider.id },
      select: {
        id: true, publicReference: true, type: true, subject: true, summary: true, status: true,
        visitorName: true, visitorEmail: true, visitorPhone: true,
        createdAt: true, updatedAt: true, lastActivityAt: true, closedAt: true,
        productListing: { select: { id: true, name: true, brand: true, specification: true, unit: true, stockStatus: true, listingStatus: true } },
        messages: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: { id: true, senderType: true, body: true, createdAt: true },
        },
      },
    });
    if (!enquiry) return jsonError(404, "ENQUIRY_NOT_FOUND", "Enquiry not found.");
    return jsonOk({ enquiry });
  } catch (error) {
    logServerError("provider enquiry detail", error);
    return jsonError(503, "ENQUIRY_UNAVAILABLE", "This enquiry is temporarily unavailable. Please try again.");
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const originError = sameOriginError(request);
  if (originError) return originError;
  const { user, response } = await requireApiAccess(["SUPPLIER"]);
  if (response) return response;
  if (user.status !== "ACTIVE") return jsonError(403, "ACCOUNT_NOT_ACTIVE", "Your account must be active to manage enquiries.");
  const provider = await getOwnedActiveProvider(user);
  if (!provider) return jsonError(403, "ACTIVE_PROVIDER_REQUIRED", "An active provider profile is required.");

  const { id } = await context.params;
  if (!validId(id)) return jsonError(404, "ENQUIRY_NOT_FOUND", "Enquiry not found.");
  const parsed = statusInputSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(400, "VALIDATION_ERROR", "Choose a supported enquiry status.");

  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.enquiry.findFirst({
        where: { id, providerProfileId: provider.id },
        select: { id: true, status: true },
      });
      if (!current) return { error: "NOT_FOUND" as const };
      const nextStatus = parsed.data.status as EnquiryStatus;
      if (!allowedTransitions[current.status].includes(nextStatus)) return { error: "INVALID_TRANSITION" as const };

      const now = new Date();
      const changed = await tx.enquiry.updateMany({
        where: { id, providerProfileId: provider.id, status: current.status },
        data: {
          status: nextStatus,
          lastActivityAt: now,
          ...(nextStatus === "CLOSED" || nextStatus === "DECLINED" ? { closedAt: now } : {}),
        },
      });
      if (changed.count !== 1) return { error: "CONFLICT" as const };

      await writeAuditLogOrThrow(tx, {
        userId: user.id,
        action: "ENQUIRY_STATUS_CHANGED",
        resourceType: "enquiry",
        resourceId: id,
        metadata: { previousStatus: current.status, status: nextStatus },
        request,
      });
      return { status: nextStatus, updatedAt: now };
    });

    if ("error" in result) {
      if (result.error === "NOT_FOUND") return jsonError(404, "ENQUIRY_NOT_FOUND", "Enquiry not found.");
      if (result.error === "INVALID_TRANSITION") return jsonError(409, "INVALID_STATUS_TRANSITION", "This enquiry cannot move to that status.");
      return jsonError(409, "ENQUIRY_STATUS_CONFLICT", "The enquiry changed while you were updating it. Refresh and try again.");
    }
    return jsonOk({ status: result.status, updatedAt: result.updatedAt });
  } catch (error) {
    logServerError("provider enquiry status update", error);
    return jsonError(503, "ENQUIRY_UPDATE_UNAVAILABLE", "The enquiry could not be updated. Please try again.");
  }
}
