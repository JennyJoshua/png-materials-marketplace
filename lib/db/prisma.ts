import { PrismaClient } from "@prisma/client";

/**
 * Single Prisma client. Connects with DATABASE_URL (Supabase pooled connection). This is a
 * privileged server-side connection: it bypasses Supabase RLS, so application code MUST enforce
 * authorization (lib/auth/guards.ts) before any query that returns or changes user data.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
