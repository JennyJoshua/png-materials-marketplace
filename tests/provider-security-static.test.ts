import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
const migration=readFileSync("prisma/migrations/20261031000000_phase2_provider_foundation/migration.sql","utf8");
const ownerRoute=readFileSync("app/api/providers/me/route.ts","utf8");
const adminRoute=readFileSync("app/api/admin/providers/route.ts","utf8");
describe("provider foundation security invariants",()=>{
 it("enables RLS and revokes public client grants on both new public tables",()=>{for(const table of ["provider_profiles","service_categories"]){expect(migration).toContain(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);}expect(migration).toContain("REVOKE ALL ON TABLE \"provider_profiles\", \"service_categories\"");expect(migration).not.toMatch(/CREATE POLICY/i);});
 it("scopes owner queries to the verified application user id",()=>{expect(ownerRoute).toContain("where:{userId:user.id}");expect(ownerRoute).not.toContain("request.json()).userId");});
 it("uses database-backed ADMIN guard and blocks self review",()=>{expect(adminRoute).toContain('requireApiAccess(["ADMIN"])');expect(adminRoute).toContain("old.userId===user.id");});
});

describe("service category seed",()=>{
 it("uses unique-name upsert with an empty update to preserve admin edits",()=>{const seed=readFileSync("prisma/seed.ts","utf8");expect(seed).toContain("prisma.serviceCategory.upsert");expect(seed).toContain("update: {}, create: { name }");});
});
