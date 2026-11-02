import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureProfile, ProfileError } from "@/lib/auth/profile";
import { registerSchema, fieldErrors } from "@/lib/validation/auth";
import { ROLE_HOME } from "@/lib/roles";
import { registerLimiter } from "@/lib/security/rate-limit";
import { writeAuditLog } from "@/lib/security/audit";
import { configErrorResponse, getClientIp, getSiteUrl, isSameOrigin, jsonError, jsonOk, readJson } from "@/lib/security/http";
import { ConfigError } from "@/lib/env";
import { logServerError } from "@/lib/security/log";

/**
 * Public registration is provider-only. Both individual and business providers use the existing
 * SUPPLIER database role for backward compatibility; providerKind/providerType are authoritative
 * fields on ProviderProfile. CUSTOMER remains only for pre-existing accounts and recovery.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, "BAD_ORIGIN", "Request origin not allowed.");
  const limit = registerLimiter.check(getClientIp(request));
  if (!limit.allowed) return jsonError(429, "RATE_LIMITED", "Too many sign-up attempts. Try again later.", { "Retry-After": String(limit.retryAfterSeconds) });

  const body = await readJson(request);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Check the highlighted fields.", fields: fieldErrors(parsed.error) } },
      { status: 400 },
    );
  }
  const input = parsed.data;
  const providerKind = input.accountType === "INDIVIDUAL_PROVIDER" ? "INDIVIDUAL" : "BUSINESS";

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: getSiteUrl(request) ? `${getSiteUrl(request)}/auth/callback` : undefined,
        data: {
          full_name: input.fullName,
          phone: input.phone,
          provider_display_name: input.displayName,
          provider_kind: providerKind,
          provider_type: input.providerType,
          province: input.province,
        },
      },
    });
    if (error) {
      if (error.code === "weak_password") return jsonError(400, "WEAK_PASSWORD", "Choose a stronger password.");
      logServerError("register: supabase signUp", error);
      return jsonError(400, "REGISTRATION_FAILED", "We could not create the account. Check your details and try again.");
    }
    const authUser = data.user;
    if (!authUser) return jsonError(502, "AUTH_UNAVAILABLE", "Sign-up is unavailable right now. Try again shortly.");
    // Avoid revealing whether an email is already registered.
    if (Array.isArray(authUser.identities) && authUser.identities.length === 0) return jsonOk({ needsEmailConfirmation: true }, 201);

    let hintSaved = true;
    try {
      const admin = createSupabaseAdminClient();
      const { error: metaError } = await admin.auth.admin.updateUserById(authUser.id, {
        // SUPPLIER is the existing database role for provider accounts; kind/type live in ProviderProfile.
        app_metadata: { registration_type: "SUPPLIER" },
      });
      if (metaError) {
        hintSaved = false;
        logServerError("register: could not save registration hint", metaError);
      }
    } catch (hintError) {
      hintSaved = false;
      logServerError("register: could not save registration hint", hintError);
    }

    let profileCreated = true;
    try {
      await ensureProfile({
        authUserId: authUser.id,
        email: input.email,
        fullName: input.fullName,
        phone: input.phone,
        role: "SUPPLIER",
        emailConfirmed: Boolean(authUser.email_confirmed_at),
        provider: {
          displayName: input.displayName,
          providerKind,
          providerType: input.providerType,
          province: input.province,
        },
      });
    } catch (profileError) {
      profileCreated = false;
      logServerError("register: provider profile creation", profileError);
      await writeAuditLog({
        userId: null,
        action: "PROFILE_CREATE_FAILED",
        resourceType: "user",
        resourceId: authUser.id,
        metadata: { reason: profileError instanceof ProfileError ? profileError.code : "DB_ERROR", hintSaved, accountType: input.accountType },
        request,
      });
    }
    if (!profileCreated && !hintSaved) return jsonError(500, "SETUP_INCOMPLETE", "We could not finish setting up the account. Try again later.");
    if (profileCreated) {
      await writeAuditLog({
        userId: authUser.id,
        action: "USER_REGISTERED",
        resourceType: "user",
        resourceId: authUser.id,
        metadata: { accountType: input.accountType, providerKind, providerType: input.providerType },
        request,
      });
    }
    const signedIn = Boolean(data.session);
    return jsonOk({ needsEmailConfirmation: !signedIn, redirectTo: signedIn ? ROLE_HOME.SUPPLIER : undefined }, 201);
  } catch (unexpected) {
    logServerError("register: unexpected failure", unexpected);
    if (unexpected instanceof ConfigError) return configErrorResponse(unexpected);
    return jsonError(500, "SERVER_ERROR", "Something went wrong. Try again shortly.");
  }
}
