import type { User } from "@supabase/supabase-js";
export const ORIGIN = "https://app.test";
export function jsonRequest(path: string, options: { method?: string; body?: unknown; headers?: Record<string, string>; origin?: string | null } = {}): Request {
  const { method = "POST", body, headers = {}, origin = ORIGIN } = options;
  return new Request(`${ORIGIN}${path}`, { method, headers: { "content-type": "application/json", host: "app.test", ...(origin ? { origin } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
}
export function supabaseUser(overrides: Partial<User> = {}): User {
  return {
    id: "11111111-1111-4111-8111-111111111111", aud: "authenticated", email: "jane@example.com",
    app_metadata: {}, user_metadata: {}, created_at: "2026-10-05T00:00:00Z",
    email_confirmed_at: "2026-10-05T00:00:00Z", identities: [{ id: "i1" } as never], ...overrides,
  } as User;
}
export const individualProviderForm = {
  accountType: "INDIVIDUAL_PROVIDER", fullName: "Jane Kila", displayName: "Jane Kila Services",
  providerType: "BOTH", province: "Gulf", email: "Jane@Example.com", phone: "+675 7000 1234",
  password: "correct horse 42", confirmPassword: "correct horse 42",
};
export const businessProviderForm = {
  accountType: "BUSINESS_PROVIDER", fullName: "Peter Wama", displayName: "Highlands Hardware",
  providerType: "PRODUCTS", province: "Western Highlands", email: "peter@highlands.example",
  phone: "+675 7100 5678", password: "sturdy cement 99", confirmPassword: "sturdy cement 99",
};
/** Legacy payload retained only to assert that buyer registration is rejected. */
export const customerForm = { ...individualProviderForm, accountType: "CUSTOMER" };
/** Alias for older tests that used this fixture name; it now represents a business provider. */
export const supplierForm = businessProviderForm;
