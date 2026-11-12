import { createSupabaseServerClient } from "@/lib/supabase/server";
import { passwordResetSchema } from "@/lib/validation/auth";
import { passwordResetLimiter } from "@/lib/security/rate-limit";
import { getClientIp, getPublicOrigin, isSameOrigin, jsonError, jsonOk, readJson } from "@/lib/security/http";
import { ConfigError } from "@/lib/env";
import { logServerError } from "@/lib/security/log";

const GENERIC_MESSAGE = "If an account exists for that email address, a password recovery link will be sent.";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, "BAD_ORIGIN", "Request origin not allowed.");
  const limit = passwordResetLimiter.check(getClientIp(request));
  if (!limit.allowed) return jsonError(429, "RATE_LIMITED", "Too many recovery requests. Try again later.", { "Retry-After": String(limit.retryAfterSeconds) });

  const parsed = passwordResetSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(400, "VALIDATION_ERROR", "Enter a valid email address.");

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${getPublicOrigin(request)}/auth/callback?next=/auth/update-password`,
    });
    // Keep the response identical for existing and unknown addresses.
    if (error) logServerError("password reset: Supabase request failed", error);
    return jsonOk({ message: GENERIC_MESSAGE });
  } catch (error) {
    if (error instanceof ConfigError) logServerError("password reset: configuration unavailable", error);
    else logServerError("password reset: unexpected failure", error);
    return jsonOk({ message: GENERIC_MESSAGE });
  }
}
