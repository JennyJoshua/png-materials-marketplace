import { prisma } from "@/lib/db/prisma";
import { logServerError } from "@/lib/security/log";
import type { Prisma } from "@prisma/client";
import { getClientIp } from "@/lib/security/http";

export const AUDIT_ACTIONS = [
  "USER_REGISTERED",
  "USER_LOGIN",
  "USER_LOGIN_FAILED",
  "USER_LOGOUT",
  "PROFILE_CREATE_FAILED",
  "PROFILE_RECOVERED",
  "ACCESS_DENIED",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

const SECRET_KEY = /pass|token|secret|key|authorization|cookie|session|jwt/i;

/** Drops any metadata key that looks like a credential. Audit metadata must never hold secrets. */
export function sanitizeMetadata(input: Record<string, unknown> | undefined): Prisma.InputJsonObject | undefined {
  if (!input) return undefined;
  const out: Record<string, Prisma.InputJsonValue> = {};
  for (const [key, value] of Object.entries(input)) {
    if (SECRET_KEY.test(key)) continue;
    if (value === null || value === undefined) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") out[key] = value;
  }
  return out;
}

type AuditInput = {
  userId?: string | null;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  request?: Request;
};

/** Best-effort: an audit failure must never break the request that triggered it. */
export async function writeAuditLog(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        metadata: sanitizeMetadata(input.metadata),
        ipAddress: input.request ? getClientIp(input.request) : undefined,
        userAgent: input.request?.headers.get("user-agent")?.slice(0, 300),
      },
    });
  } catch (error) {
    logServerError(`audit: could not record ${input.action}`, error);
  }
}
