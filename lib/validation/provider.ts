import { z } from "zod";
const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal("")).transform(v => v || undefined);
const website = z.string().trim().max(500).optional().or(z.literal("")).transform(v => v || undefined).refine(v => !v || /^https?:\/\//i.test(v), "Enter a valid http(s) website URL.");
export const providerProfileSchema = z.object({
 displayName:z.string().trim().min(1).max(120), providerKind:z.enum(["INDIVIDUAL","BUSINESS"]), providerType:z.enum(["PRODUCTS","SERVICES","BOTH"]),
 description:optionalText(2000), phone:optionalText(40), publicEmail:z.string().trim().email().max(254).optional().or(z.literal("")).transform(v=>v||undefined),
 address:optionalText(300), province:z.string().trim().min(1).max(100), district:optionalText(100), townOrArea:optionalText(120),
 businessRegistrationNumber:optionalText(100), websiteUrl:website, logoUrl:optionalText(500), deliveryAvailable:z.boolean().default(false), pickupAvailable:z.boolean().default(false),
}).strict();
export const providerAdminActionSchema = z.object({status:z.enum(["ACTIVE","SUSPENDED"]).optional(),verificationLevel:z.enum(["UNVERIFIED","CONTACT_CONFIRMED","DOCUMENTS_CHECKED"]).optional()}).strict().refine(v=>v.status!==undefined||v.verificationLevel!==undefined,"Choose a status or verification change.");
