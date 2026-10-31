import { describe, expect, it } from "vitest";
import { providerAdminActionSchema, providerProfileSchema } from "@/lib/validation/provider";
const valid={displayName:"  Baimuru Plumbing ",providerKind:"INDIVIDUAL",providerType:"SERVICES",province:"  Gulf  ",deliveryAvailable:false,pickupAvailable:false};
describe("provider profile validation",()=>{
 it("trims required text and accepts optional PNG business details",()=>{const r=providerProfileSchema.parse(valid);expect(r.displayName).toBe("Baimuru Plumbing");expect(r.province).toBe("Gulf");});
 it("rejects blank names and provinces",()=>{expect(providerProfileSchema.safeParse({...valid,displayName:"  "}).success).toBe(false);expect(providerProfileSchema.safeParse({...valid,province:" "}).success).toBe(false);});
 it("enforces field length bounds",()=>{expect(providerProfileSchema.safeParse({...valid,description:"x".repeat(2001)}).success).toBe(false);expect(providerProfileSchema.safeParse({...valid,displayName:"x".repeat(121)}).success).toBe(false);});
 it("allows empty optional website but rejects non-http URLs",()=>{expect(providerProfileSchema.safeParse({...valid,websiteUrl:""}).success).toBe(true);expect(providerProfileSchema.safeParse({...valid,websiteUrl:"javascript:alert(1)"}).success).toBe(false);});
 it("rejects client-supplied status, role and verification claims",()=>{expect(providerProfileSchema.safeParse({...valid,status:"ACTIVE"}).success).toBe(false);expect(providerProfileSchema.safeParse({...valid,role:"ADMIN"}).success).toBe(false);expect(providerProfileSchema.safeParse({...valid,verificationLevel:"DOCUMENTS_CHECKED"}).success).toBe(false);});
 it("requires an administrator action",()=>{expect(providerAdminActionSchema.safeParse({}).success).toBe(false);expect(providerAdminActionSchema.safeParse({status:"ACTIVE"}).success).toBe(true);});
});
