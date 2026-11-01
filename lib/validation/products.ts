import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal("")).transform((v) => v || undefined);

const price = z.string().trim().regex(/^\d{1,10}(\.\d{1,2})?$/, "Enter a positive price with up to two decimal places.")
  .refine((v) => Number(v) > 0, "Price must be greater than zero.");

export const productListingInputSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  brand: optionalText(120),
  specification: optionalText(500),
  description: optionalText(4000),
  unit: z.string().trim().min(1).max(40),
  price,
  stockStatus: z.enum(["IN_STOCK", "LIMITED_STOCK", "OUT_OF_STOCK", "CONTACT_SUPPLIER"]),
}).strict();

export const productListingPatchSchema = productListingInputSchema.partial().strict()
  .refine((v) => Object.keys(v).length > 0, "Provide at least one field to update.");

export const productCategoryInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: optionalText(500),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
}).strict();

export const productCategoryPatchSchema = productCategoryInputSchema.partial().strict()
  .refine((v) => Object.keys(v).length > 0, "Provide at least one field to update.");

export const productModerationSchema = z.object({
  status: z.enum(["SUSPENDED", "ACTIVE"]),
  reason: z.string().trim().min(3).max(500),
}).strict();
