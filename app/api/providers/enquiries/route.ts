import { requireApiAccess } from "@/lib/auth/guards";
import { getOwnedActiveProvider } from "@/lib/auth/provider-access";
import { prisma } from "@/lib/db/prisma";
import { jsonError, jsonOk } from "@/lib/security/http";
import { logServerError } from "@/lib/security/log";
import { EnquiryStatus } from "@prisma/client";

const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 50;
const statuses = new Set<string>(Object.values(EnquiryStatus));

function positiveInteger(value: string | null, fallback: number, maximum: number) {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= maximum ? parsed : null;
}

export async function GET(request: Request) {
  const { user, response } = await requireApiAccess(["SUPPLIER"]);
  if (response) return response;
  if (user.status !== "ACTIVE") return jsonError(403, "ACCOUNT_NOT_ACTIVE", "Your account must be active to access enquiries.");

  const provider = await getOwnedActiveProvider(user);
  if (!provider) return jsonError(403, "ACTIVE_PROVIDER_REQUIRED", "An active provider profile is required.");

  const url = new URL(request.url);
  const page = positiveInteger(url.searchParams.get("page"), 1, 1000000);
  const pageSize = positiveInteger(url.searchParams.get("pageSize"), PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX);
  if (page === null || pageSize === null) {
    return jsonError(400, "INVALID_PAGINATION", `Page must be between 1 and 1000000 and pageSize between 1 and ${PAGE_SIZE_MAX}.`);
  }

  const status = url.searchParams.get("status");
  if (status && !statuses.has(status)) return jsonError(400, "INVALID_STATUS", "Choose a valid enquiry status.");
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length > 100) return jsonError(400, "SEARCH_TOO_LONG", "Search must be 100 characters or fewer.");

  const where = {
    providerProfileId: provider.id,
    ...(status ? { status: status as EnquiryStatus } : {}),
    ...(q ? { OR: [
      { publicReference: { contains: q, mode: "insensitive" as const } },
      { subject: { contains: q, mode: "insensitive" as const } },
    ] } : {}),
  };

  try {
    const [total, enquiries] = await prisma.$transaction([
      prisma.enquiry.count({ where }),
      prisma.enquiry.findMany({
        where,
        orderBy: [{ lastActivityAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, publicReference: true, subject: true, summary: true, status: true,
          createdAt: true, lastActivityAt: true, updatedAt: true,
          productListing: { select: { id: true, name: true, brand: true, unit: true, stockStatus: true } },
        },
      }),
    ]);
    return jsonOk({
      enquiries,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    logServerError("provider enquiry inbox list", error);
    return jsonError(503, "ENQUIRIES_UNAVAILABLE", "Your enquiries are temporarily unavailable. Please try again.");
  }
}
