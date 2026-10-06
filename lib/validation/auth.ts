import { z } from "zod";

const email = z.string().trim().toLowerCase().max(254).pipe(z.email("Enter a valid email address."));

const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number (digits, spaces, + - ( ) only).");

const fullName = z.string().trim().min(2, "Enter your full name.").max(120);

export const passwordRule = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(72, "Use at most 72 characters.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/[0-9]/, "Include at least one number.");

const shortText = (label: string, min = 2, max = 200) =>
  z.string().trim().min(min, `Enter ${label}.`).max(max);

const passwordsMatch = (v: { password: string; confirmPassword: string }) => v.password === v.confirmPassword;
const mismatch = { message: "Passwords do not match.", path: ["confirmPassword"] };

// z.strictObject rejects unknown keys, so a client-supplied "role" field is a validation error.
const customerRegistration = z
  .strictObject({
    accountType: z.literal("CUSTOMER"),
    fullName,
    email,
    phone,
    password: passwordRule,
    confirmPassword: z.string(),
  })
  .refine(passwordsMatch, mismatch);

const supplierRegistration = z
  .strictObject({
    accountType: z.literal("SUPPLIER"),
    fullName,
    businessName: shortText("your business name", 2, 160),
    email,
    phone,
    password: passwordRule,
    confirmPassword: z.string(),
    businessAddress: shortText("your business address", 3, 300),
    location: shortText("your town or province", 2, 120),
  })
  .refine(passwordsMatch, mismatch);

export const registerSchema = z.discriminatedUnion("accountType", [customerRegistration, supplierRegistration]);
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.strictObject({
  email,
  password: z.string().min(1, "Enter your password.").max(72),
  next: z.string().max(512).optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Profile data we are willing to rebuild from Supabase user_metadata (data only, never a role). */
export const profileMetadataSchema = z.object({
  full_name: fullName,
  phone,
  business_name: shortText("business name", 2, 160).optional(),
  business_address: shortText("business address", 3, 300).optional(),
  location: shortText("location", 2, 120).optional(),
});

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    out[key] ??= issue.message;
  }
  return out;
}
