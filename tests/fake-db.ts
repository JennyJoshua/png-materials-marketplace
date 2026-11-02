import type { ProfileDb } from "@/lib/auth/profile";
type Row = Record<string, unknown> & { id: string };
export type FakeDb = ProfileDb & {
  state: { users: Row[]; customerProfiles: Row[]; supplierProfiles: Row[]; providerProfiles: Row[] };
  failOnce: (op: "user.create" | "customerProfile.create" | "supplierProfile.create" | "providerProfile.create", error: unknown) => void;
};

/** In-memory stand-in for profile persistence, with transaction rollback. */
export function createFakeDb(): FakeDb {
  const state = { users: [] as Row[], customerProfiles: [] as Row[], supplierProfiles: [] as Row[], providerProfiles: [] as Row[] };
  const failures = new Map<string, unknown>();
  let seq = 0;
  const maybeFail = (op: string) => {
    if (failures.has(op)) { const error = failures.get(op); failures.delete(op); throw error; }
  };
  const db = {
    state,
    failOnce(op: string, error: unknown) { failures.set(op, error); },
    async $transaction<T>(fn: (tx: ProfileDb) => Promise<T>): Promise<T> {
      const snapshot = structuredClone(state);
      try { return await fn(db as unknown as ProfileDb); }
      catch (error) {
        state.users = snapshot.users;
        state.customerProfiles = snapshot.customerProfiles;
        state.supplierProfiles = snapshot.supplierProfiles;
        state.providerProfiles = snapshot.providerProfiles;
        throw error;
      }
    },
    user: {
      async findUnique({ where }: { where: { id: string } }) { return (state.users.find(u => u.id === where.id) as never) ?? null; },
      async create({ data }: { data: Record<string, unknown> }) {
        maybeFail("user.create");
        const row = { status: "PENDING", role: "CUSTOMER", ...data } as unknown as Row;
        state.users.push(row); return row as never;
      },
      async update({ where, data }: { where: { id: string }; data: Record<string, unknown> }) {
        const row = state.users.find(u => u.id === where.id); if (!row) throw new Error("not found");
        Object.assign(row, data); return row as never;
      },
    },
    customerProfile: {
      async findUnique({ where }: { where: { userId: string } }) { return state.customerProfiles.find(p => p.userId === where.userId) ?? null; },
      async create({ data }: { data: Record<string, unknown> }) {
        maybeFail("customerProfile.create"); const row = { id: `c${++seq}`, ...data } as Row;
        state.customerProfiles.push(row); return row;
      },
    },
    supplierProfile: {
      async findUnique({ where }: { where: { userId: string } }) { return state.supplierProfiles.find(p => p.userId === where.userId) ?? null; },
      async create({ data }: { data: Record<string, unknown> }) {
        maybeFail("supplierProfile.create"); const row = { id: `s${++seq}`, ...data } as Row;
        state.supplierProfiles.push(row); return row;
      },
    },
    providerProfile: {
      async findUnique({ where }: { where: { userId: string } }) { return state.providerProfiles.find(p => p.userId === where.userId) ?? null; },
      async create({ data }: { data: Record<string, unknown> }) {
        maybeFail("providerProfile.create"); const row = { id: `p${++seq}`, ...data } as Row;
        state.providerProfiles.push(row); return row;
      },
    },
  } as unknown as FakeDb;
  return db;
}
