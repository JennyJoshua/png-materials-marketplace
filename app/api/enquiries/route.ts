import { randomBytes } from "node:crypto";
import { isIP } from "node:net";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { publicListingWhere } from "@/lib/products/queries";
import { jsonError, jsonOk, sameOriginError } from "@/lib/security/http";
import { logServerError } from "@/lib/security/log";
import { publicEnquiryLimiter } from "@/lib/security/rate-limit";
import { writeAuditLogOrThrow } from "@/lib/security/audit";
import { productEnquiryInputSchema } from "@/lib/validation/enquiries";

const MAX_BODY_BYTES = 16 * 1024;

async function readLimitedJson(request: Request): Promise<unknown | null> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return null;

  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }

  try {
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    return null;
  }
}

/** Render is fronted by Cloudflare; do not trust the client-controlled leftmost X-Forwarded-For value. */
function rateLimitKey(request: Request): string {
  const candidate = request.headers.get("cf-connecting-ip")?.trim() ?? "";
  return isIP(candidate) ? candidate : "unknown";
}

function createPublicReference(): string {
  return `ENQ-${randomBytes(8).toString("hex").toUpperCase()}`;
}

export async function POST(request: Request) {
  const originError = sameOriginError(request);
  if (originError) return originError;

  const limit = publicEnquiryLimiter.check(rateLimitKey(request));
  if (!limit.allowed) {
    return jsonError(
      429,
      "ENQUIRY_RATE_LIMITED",
      "Too many enquiries have been submitted. Please try again later.",
      { "Retry-After": String(limit.retryAfterSeconds) },
    );
  }

  const contentType = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    return jsonError(415, "UNSUPPORTED_MEDIA_TYPE", "Submit the enquiry as JSON.");
  }

  const body = await readLimitedJson(request);
  if (body === null) {
    return jsonError(400, "INVALID_REQUEST_BODY", "The request body is missing, too large, or invalid JSON.");
  }

  const parsed = productEnquiryInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", "Check the product and contact details, subject, and message.");
  }

  try {
    const listing = await prisma.productListing.findFirst({
      where: { ...publicListingWhere(), id: parsed.data.productListingId },
      select: {
        id: true,
        providerProfileId: true,
        providerProfile: { select: { id: true, status: true, providerType: true } },
        category: { select: { status: true } },
      },
    });

    if (
      !listing ||
      listing.providerProfile.status !== "ACTIVE" ||
      !["PRODUCTS", "BOTH"].includes(listing.providerProfile.providerType) ||
      listing.category.status !== "ACTIVE"
    ) {
      return jsonError(404, "PRODUCT_UNAVAILABLE", "This product is not currently available for enquiries.");
    }

    // Retry only a public-reference uniqueness collision. All related writes and audit logging
    // happen in one transaction, so an audit failure cannot leave a partial enquiry.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const publicReference = createPublicReference();
      try {
        const enquiry = await prisma.$transaction(async (tx) => {
          const created = await tx.enquiry.create({
            data: {
              publicReference,
              type: "PRODUCT",
              providerProfileId: listing.providerProfileId,
              productListingId: listing.id,
              visitorName: parsed.data.visitorName,
              visitorEmail: parsed.data.visitorEmail,
              visitorPhone: parsed.data.visitorPhone,
              subject: parsed.data.subject,
              summary: parsed.data.message,
              messages: {
                create: {
                  senderType: "VISITOR",
                  body: parsed.data.message,
                },
              },
            },
            select: { id: true, publicReference: true, status: true, createdAt: true },
          });

          await writeAuditLogOrThrow(tx, {
            action: "ENQUIRY_SUBMITTED",
            resourceType: "enquiry",
            resourceId: created.id,
            metadata: { type: "PRODUCT", productListingId: listing.id },
            request,
          });
          return created;
        });

        return jsonOk({
          enquiry: {
            reference: enquiry.publicReference,
            status: enquiry.status,
            submittedAt: enquiry.createdAt,
          },
          message: "Your enquiry has been sent to the provider.",
        }, 201);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002" &&
          attempt < 2
        ) {
          continue;
        }
        throw error;
      }
    }
    return jsonError(503, "ENQUIRY_UNAVAILABLE", "Your enquiry could not be submitted. Please try again.");
  } catch (error) {
    logServerError("public product enquiry submission", error);
    return jsonError(503, "ENQUIRY_UNAVAILABLE", "Your enquiry could not be submitted. Please try again later.");
  }
}
