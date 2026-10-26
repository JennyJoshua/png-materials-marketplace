import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabaseUser } from "./helpers";

const h = vi.hoisted(() => ({ ensureProfile: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ prisma: { user: { findUnique: vi.fn() } } }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: {} }) }));
vi.mock("@/lib/security/audit", () => ({ writeAuditLog: vi.fn() }));
vi.mock("@/lib/auth/profile", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/profile")>("@/lib/auth/profile");
  return { ...actual, ensureProfile: h.ensureProfile };
});

import { recoverProfile } from "@/lib/auth/session";

describe("recoverProfile failures are no longer silent", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    vi.clearAllMocks();
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("logs why recovery failed (still returns null, as before)", async () => {
    h.ensureProfile.mockRejectedValue(Object.assign(new Error("The table `public.users` does not exist in the current database."), { name: "PrismaClientKnownRequestError", code: "P2021" }));
    const result = await recoverProfile(
      supabaseUser({ app_metadata: { registration_type: "CUSTOMER" }, user_metadata: { full_name: "Jane Kila", phone: "+675 7000 1234" } }),
    );
    expect(result).toBeNull();
    const out = consoleError.mock.calls.map((c: unknown[]) => String(c[0])).join("\n");
    expect(out).toContain("profile recovery");
    expect(out).toContain("P2021");
  });
});
