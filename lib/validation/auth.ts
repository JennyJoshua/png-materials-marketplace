import { z } from "zod";

const email = z.string().trim().toLowerCase().max(254).pipe(z.email("Enter a valid email address."));
const phone = z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number (digits, spaces, + - ( ) only).");
const fullName = z.string().trim().min(2, "Enter your full name.").max(120);
export const passwordRule = z.string().min(10, "Use at least 10 characters.").max(72, "Use at most 72 characters.")
  .regex(/[A-Za-z]/, "Include at least one letter.").regex(/[0-9]/, "Include at least one number.");

export const passwordResetSchema = z.strictObject({ email });
export const passwordUpdateSchema = z.strictObject({
  password: passwordRule,
  confirmPassword: z.string(),
}).refine(value => value.password === value.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});
const shortText = (label: string, min = 2, max = 200) => z.string().trim().min(min, `Enter ${label}.`).max(max);
const passwordsMatch = (v: { password: string; confirmPassword: string }) => v.password === v.confirmPassword;
const mismatch = { message: "Passwords do not match.", path: ["confirmPassword"] };

const individualProviderRegistration = z.strictObject({
  accountType: z.literal("INDIVIDUAL_PROVIDER"),
  fullName,
  displayName: shortText("your public provider name", 2, 120),
  providerType: z.enum(["PRODUCTS", "SERVICES", "BOTH"]),
  province: shortText("your province", 2, 100),
  email, phone, password: passwordRule, confirmPassword: z.string(),
}).refine(passwordsMatch, mismatch);

const businessProviderRegistration = z.strictObject({
  accountType: z.literal("BUSINESS_PROVIDER"),
  fullName,
  displayName: shortText("your business name", 2, 120),
  providerType: z.enum(["PRODUCTS", "SERVICES", "BOTH"]),
  province: shortText("your province", 2, 100),
  email, phone, password: passwordRule, confirmPassword: z.string(),
}).refine(passwordsMatch, mismatch);

/** Public registration creates providers only. CUSTOMER remains supported only for legacy recovery. */
export const registerSchema = z.discriminatedUnion("accountType", [individualProviderRegistration, businessProviderRegistration]);
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.strictObject({
  email,
  password: z.string().min(1, "Enter your password.").max(72),
  next: z.string().max(512).optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Safe descriptive metadata used only to recover a failed profile write; never a role claim. */
export const profileMetadataSchema = z.object({
  full_name: fullName,
  phone,
  business_name: shortText("business name", 2, 160).optional(),
  business_address: shortText("business address", 3, 300).optional(),
  location: shortText("location", 2, 120).optional(),
  provider_display_name: shortText("provider display name", 2, 120).optional(),
  provider_kind: z.enum(["INDIVIDUAL", "BUSINESS"]).optional(),
  provider_type: z.enum(["PRODUCTS", "SERVICES", "BOTH"]).optional(),
  province: shortText("province", 2, 100).optional(),
});

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    out[key] ??= issue.message;
  }
  return out;
}
