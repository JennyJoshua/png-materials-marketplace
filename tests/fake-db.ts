import type { ProfileDb } from "@/lib/auth/profile";

type Row = Record<string, unknown> & { id: string };

export type FakeDb = ProfileDb & {
  state: { users: Row[]; customerProfiles: Row[]; supplierProfiles: Row[] };
  /** Make the next call to the named operation throw `error`. */
  failOnce: (op: "user.create" | "customerProfile.create" | "supplierProfile.create", error: unknown) => void;
};

/** In-memory stand-in for the Prisma operations used by lib/auth/profile.ts (with rollback). */
export function createFakeDb(): FakeDb {
  const state = { users: [] as Row[], customerProfiles: [] as Row[], supplierProfiles: [] as Row[] };
  const failures = new Map<string, unknown>();
  let seq = 0;

  const maybeFail = (op: string) => {
    if (failures.has(op)) {
      const error = failures.get(op);
      failures.delete(op);
      throw error;
    }
  };

  const db = {
    state,
    failOnce(op: string, error: unknown) {
      failures.set(op, error);
    },
    async $transaction<T>(fn: (tx: ProfileDb) => Promise<T>): Promise<T> {
      const snapshot = structuredClone(state);
      try {
        return await fn(db as unknown as ProfileDb);
      } catch (error) {
        state.users = snapshot.users;
        state.customerProfiles = snapshot.customerProfiles;
        state.supplierProfiles = snapshot.supplierProfiles;
        throw error;
      }
    },
    user: {
      async findUnique({ where }: { where: { id: string } }) {
        return (state.users.find((u) => u.id === where.id) as never) ?? null;
      },
      async create({ data }: { data: Record<string, unknown> }) {
        maybeFail("user.create");
        const row = { status: "PENDING", role: "CUSTOMER", ...data } as unknown as Row;
        state.users.push(row);
        return row as never;
      },
      async update({ where, data }: { where: { id: string }; data: Record<string, unknown> }) {
        const row = state.users.find((u) => u.id === where.id);
        if (!row) throw new Error("not found");
        Object.assign(row, data);
        return row as never;
      },
    },
    customerProfile: {
      async findUnique({ where }: { where: { userId: string } }) {
        return state.customerProfiles.find((p) => p.userId === where.userId) ?? null;
      },
      async create({ data }: { data: Record<string, unknown> }) {
        maybeFail("customerProfile.create");
        const row = { id: `c${++seq}`, ...data } as Row;
        state.customerProfiles.push(row);
        return row;
      },
    },
    supplierProfile: {
      async findUnique({ where }: { where: { userId: string } }) {
        return state.supplierProfiles.find((p) => p.userId === where.userId) ?? null;
      },
      async create({ data }: { data: Record<string, unknown> }) {
        maybeFail("supplierProfile.create");
        const row = { id: `s${++seq}`, ...data } as Row;
        state.supplierProfiles.push(row);
        return row;
      },
    },
  } as unknown as FakeDb;
  return db;
}
