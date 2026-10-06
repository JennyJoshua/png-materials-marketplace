import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isRegistrationRole, type RegistrationRole, type Role } from "@/lib/roles";

export class ProfileError extends Error {
  constructor(
    public readonly code: "ROLE_NOT_ALLOWED" | "SUPPLIER_DETAILS_MISSING" | "CONFLICT",
    message: string,
  ) {
    super(message);
    this.name = "ProfileError";
  }
}

export type ProfileSeed = {
  /** Supabase Auth user UUID - becomes users.id. */
  authUserId: string;
  email: string;
  fullName: string;
  phone: string;
  /** Role requested at registration. ADMIN is refused here; admins are promoted manually. */
  role: RegistrationRole;
  emailConfirmed: boolean;
  supplier?: { businessName: string; businessAddress: string; location: string };
};

type UserRow = { id: string; role: Role; status: "ACTIVE" | "PENDING" | "SUSPENDED" };

/** The few Prisma operations this module needs (lets tests use an in-memory fake). */
export interface ProfileDb {
  $transaction<T>(fn: (tx: ProfileDb) => Promise<T>): Promise<T>;
  user: {
    findUnique(args: { where: { id: string } }): Promise<UserRow | null>;
    create(args: { data: Record<string, unknown> }): Promise<UserRow>;
    update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<UserRow>;
  };
  customerProfile: {
    findUnique(args: { where: { userId: string } }): Promise<{ id: string } | null>;
    create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
  };
  supplierProfile: {
    findUnique(args: { where: { userId: string } }): Promise<{ id: string } | null>;
    create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
  };
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError
    ? error.code === "P2002"
    : typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
}

async function run(db: ProfileDb, seed: ProfileSeed) {
  return db.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { id: seed.authUserId } });

    let user: UserRow;
    if (!existing) {
      user = await tx.user.create({
        data: {
          id: seed.authUserId,
          role: seed.role,
          fullName: seed.fullName,
          email: seed.email.toLowerCase(),
          phone: seed.phone,
          status: seed.emailConfirmed ? "ACTIVE" : "PENDING",
        },
      });
    } else if (existing.status === "PENDING" && seed.emailConfirmed) {
      // The role of an existing user is NEVER changed here; only e-mail confirmation activates it.
      user = await tx.user.update({ where: { id: existing.id }, data: { status: "ACTIVE" } });
    } else {
      user = existing;
    }

    if (user.role === "CUSTOMER") {
      const profile = await tx.customerProfile.findUnique({ where: { userId: user.id } });
      if (!profile) await tx.customerProfile.create({ data: { userId: user.id } });
    } else if (user.role === "SUPPLIER") {
      const profile = await tx.supplierProfile.findUnique({ where: { userId: user.id } });
      if (!profile) {
        if (!seed.supplier) throw new ProfileError("SUPPLIER_DETAILS_MISSING", "Supplier business details are required.");
        await tx.supplierProfile.create({
          data: {
            userId: user.id,
            businessName: seed.supplier.businessName,
            businessAddress: seed.supplier.businessAddress,
            location: seed.supplier.location,
            phone: seed.phone,
            email: seed.email.toLowerCase(),
            // verificationStatus defaults to PENDING (schema default)
          },
        });
      }
    }
    return user;
  });
}

/**
 * Creates (or completes) the application profile for a Supabase Auth user. Idempotent: calling it
 * again for the same user never creates duplicates and never changes an existing role.
 */
export async function ensureProfile(seed: ProfileSeed, db: ProfileDb = prisma as unknown as ProfileDb) {
  if (!isRegistrationRole(seed.role)) {
    throw new ProfileError("ROLE_NOT_ALLOWED", "Only CUSTOMER and SUPPLIER can be created from registration.");
  }
  try {
    return await run(db, seed);
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    // Concurrent request created the row first (e.g. register + callback at once): retry once.
    try {
      return await run(db, seed);
    } catch (retryError) {
      if (isUniqueViolation(retryError)) {
        throw new ProfileError("CONFLICT", "This email is already linked to another account.");
      }
      throw retryError;
    }
  }
}
