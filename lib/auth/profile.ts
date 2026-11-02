import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isRegistrationRole, type RegistrationRole, type Role } from "@/lib/roles";

export class ProfileError extends Error {
  constructor(
    public readonly code: "ROLE_NOT_ALLOWED" | "SUPPLIER_DETAILS_MISSING" | "PROVIDER_DETAILS_MISSING" | "CONFLICT",
    message: string,
  ) {
    super(message);
    this.name = "ProfileError";
  }
}

export type ProfileSeed = {
  authUserId: string;
  email: string;
  fullName: string;
  phone: string;
  /** Existing database role. New public provider registrations always use SUPPLIER. */
  role: RegistrationRole;
  emailConfirmed: boolean;
  /** Legacy supplier-profile recovery only. New provider registration uses provider below. */
  supplier?: { businessName: string; businessAddress: string; location: string };
  provider?: {
    displayName: string;
    providerKind: "INDIVIDUAL" | "BUSINESS";
    providerType: "PRODUCTS" | "SERVICES" | "BOTH";
    province: string;
  };
};

type UserRow = { id: string; role: Role; status: "ACTIVE" | "PENDING" | "SUSPENDED" };

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
  providerProfile: {
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
      // Legacy records remain supported for account recovery; CUSTOMER is not publicly registerable.
      const profile = await tx.customerProfile.findUnique({ where: { userId: user.id } });
      if (!profile) await tx.customerProfile.create({ data: { userId: user.id } });
    } else if (user.role === "SUPPLIER") {
      if (seed.provider) {
        const profile = await tx.providerProfile.findUnique({ where: { userId: user.id } });
        if (!profile) {
          await tx.providerProfile.create({
            data: {
              userId: user.id,
              displayName: seed.provider.displayName,
              providerKind: seed.provider.providerKind,
              providerType: seed.provider.providerType,
              province: seed.provider.province,
              // Registration phone is private account contact data. Public provider contact is opt-in.
              status: "PENDING_REVIEW",
            },
          });
        }
      }

      if (seed.supplier) {
        const legacy = await tx.supplierProfile.findUnique({ where: { userId: user.id } });
        if (!legacy) {
          await tx.supplierProfile.create({
            data: {
              userId: user.id,
              businessName: seed.supplier.businessName,
              businessAddress: seed.supplier.businessAddress,
              location: seed.supplier.location,
              phone: seed.phone,
              email: seed.email.toLowerCase(),
            },
          });
        }
      }

      if (!seed.provider && !seed.supplier) {
        const [provider, legacy] = await Promise.all([
          tx.providerProfile.findUnique({ where: { userId: user.id } }),
          tx.supplierProfile.findUnique({ where: { userId: user.id } }),
        ]);
        if (!provider && !legacy) {
          throw new ProfileError("PROVIDER_DETAILS_MISSING", "Provider profile details are required.");
        }
      }
    }
    return user;
  });
}

/** Idempotent profile creation. Existing roles are never changed and all profile writes are atomic. */
export async function ensureProfile(seed: ProfileSeed, db: ProfileDb = prisma as unknown as ProfileDb) {
  if (!isRegistrationRole(seed.role)) {
    throw new ProfileError("ROLE_NOT_ALLOWED", "Only legacy registration roles can be recovered; public registration is provider-only.");
  }
  try {
    return await run(db, seed);
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    try {
      return await run(db, seed);
    } catch (retryError) {
      if (isUniqueViolation(retryError)) throw new ProfileError("CONFLICT", "This email is already linked to another account.");
      throw retryError;
    }
  }
}
