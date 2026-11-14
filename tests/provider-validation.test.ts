import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { providerAdminActionSchema, providerProfileSchema } from "@/lib/validation/provider";
const valid={displayName:"  Baimuru Plumbing ",providerKind:"INDIVIDUAL",providerType:"SERVICES",province:"  Gulf  ",deliveryAvailable:false,pickupAvailable:false};
describe("provider profile validation",()=>{
 it("trims required text and accepts optional PNG business details",()=>{const r=providerProfileSchema.parse(valid);expect(r.displayName).toBe("Baimuru Plumbing");expect(r.province).toBe("Gulf");});
 it("rejects blank names and provinces",()=>{expect(providerProfileSchema.safeParse({...valid,displayName:"  "}).success).toBe(false);expect(providerProfileSchema.safeParse({...valid,province:" "}).success).toBe(false);});
 it("enforces field length bounds",()=>{expect(providerProfileSchema.safeParse({...valid,description:"x".repeat(2001)}).success).toBe(false);expect(providerProfileSchema.safeParse({...valid,displayName:"x".repeat(121)}).success).toBe(false);});
 it("allows empty optional website but rejects non-http URLs",()=>{expect(providerProfileSchema.safeParse({...valid,websiteUrl:""}).success).toBe(true);expect(providerProfileSchema.safeParse({...valid,websiteUrl:"javascript:alert(1)"}).success).toBe(false);});
 it("rejects client-supplied status, role and verification claims",()=>{expect(providerProfileSchema.safeParse({...valid,status:"ACTIVE"}).success).toBe(false);expect(providerProfileSchema.safeParse({...valid,role:"ADMIN"}).success).toBe(false);expect(providerProfileSchema.safeParse({...valid,verificationLevel:"DOCUMENTS_CHECKED"}).success).toBe(false);});
 it("requires an administrator action",()=>{expect(providerAdminActionSchema.safeParse({}).success).toBe(false);expect(providerAdminActionSchema.safeParse({status:"ACTIVE"}).success).toBe(true);});
 it("accepts every documented provider status, including reversals to review states",()=>{
  for(const status of ["DRAFT","PENDING_REVIEW","ACTIVE","SUSPENDED"]){
   expect(providerAdminActionSchema.safeParse({status}).success).toBe(true);
  }
 });
 it("continues to reject unknown provider statuses",()=>{
  expect(providerAdminActionSchema.safeParse({status:"DELETED"}).success).toBe(false);
 });
});
describe("provider status admin controls",()=>{
 it("keeps all four lifecycle statuses selectable in the admin UI",()=>{
  const ui=readFileSync("app/admin/providers/ProviderAdminList.tsx","utf8");
  for(const status of ["DRAFT","PENDING_REVIEW","ACTIVE","SUSPENDED"]){
   expect(ui).toContain(`value="${status}"`);
  }
  expect(ui).not.toMatch(/<option[^>]*disabled[^>]*>(?:DRAFT|PENDING_REVIEW)/);
 });
});
