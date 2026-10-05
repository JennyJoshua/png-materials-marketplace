import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureProfile, ProfileError } from "@/lib/auth/profile";
import { registerSchema, fieldErrors } from "@/lib/validation/auth";
import { ROLE_HOME } from "@/lib/roles";
import { registerLimiter } from "@/lib/security/rate-limit";
import { writeAuditLog } from "@/lib/security/audit";
import { getClientIp, getSiteUrl, isSameOrigin, jsonError, jsonOk, readJson } from "@/lib/security/http";

/**
 * Registration strategy (Option A - server-side profile creation):
 *   1. validate input (strict: a client "role" field is rejected, ADMIN is not selectable)
 *   2. Supabase Auth creates the identity (password handled ONLY by Supabase)
 *   3. trusted server code records the registration type in app_metadata (service-role key)
 *   4. the application profile is created idempotently, keyed by the Supabase user UUID
 * It never depends on signUp() returning a session, so it works with e-mail confirmation ON.
 * If step 4 fails, the user can still sign in later: syncAppUser() rebuilds the profile from the
 * trusted app_metadata hint (see lib/auth/session.ts).
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, "BAD_ORIGIN", "Request origin not allowed.");

  const limit = registerLimiter.check(getClientIp(request));
  if (!limit.allowed) {
    return jsonError(429, "RATE_LIMITED", "Too many sign-up attempts. Try again later.", {
      "Retry-After": String(limit.retryAfterSeconds),
    });
  }

  const body = await readJson(request);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Check the highlighted fields.", fields: fieldErrors(parsed.error) } },
      { status: 400 },
    );
  }
  const input = parsed.data;

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: getSiteUrl(request) ? `${getSiteUrl(request)}/auth/callback` : undefined,
        // Descriptive profile data only. The role is NEVER taken from user_metadata.
        data: {
          full_name: input.fullName,
          phone: input.phone,
          ...(input.accountType === "SUPPLIER"
            ? { business_name: input.businessName, business_address: input.businessAddress, location: input.location }
            : {}),
        },
      },
    });

    if (error) {
      if (error.code === "weak_password") {
        return jsonError(400, "WEAK_PASSWORD", "Choose a stronger password.");
      }
      console.error(`[register] supabase signUp failed: ${error.code ?? error.status ?? "unknown"}`);
      return jsonError(400, "REGISTRATION_FAILED", "We could not create the account. Check your details and try again.");
    }
    const authUser = data.user;
    if (!authUser) return jsonError(502, "AUTH_UNAVAILABLE", "Sign-up is unavailable right now. Try again shortly.");

    // Supabase returns an obfuscated user with no identities when the e-mail already exists.
    // Answer exactly like a new sign-up so the form cannot be used to discover registered e-mails.
    if (Array.isArray(authUser.identities) && authUser.identities.length === 0) {
      return jsonOk({ needsEmailConfirmation: true }, 201);
    }

    // Trusted record of what was requested; used only to recover a failed profile creation.
    let hintSaved = true;
    try {
      const admin = createSupabaseAdminClient();
      const { error: metaError } = await admin.auth.admin.updateUserById(authUser.id, {
        app_metadata: { registration_type: input.accountType },
      });
      if (metaError) hintSaved = false;
    } catch {
      hintSaved = false;
    }

    let profileCreated = true;
    try {
      await ensureProfile({
        authUserId: authUser.id,
        email: input.email,
        fullName: input.fullName,
        phone: input.phone,
        role: input.accountType,
        emailConfirmed: Boolean(authUser.email_confirmed_at),
        supplier:
          input.accountType === "SUPPLIER"
            ? { businessName: input.businessName, businessAddress: input.businessAddress, location: input.location }
            : undefined,
      });
    } catch (profileError) {
      profileCreated = false;
      await writeAuditLog({
        userId: null,
        action: "PROFILE_CREATE_FAILED",
        resourceType: "user",
        resourceId: authUser.id,
        metadata: { reason: profileError instanceof ProfileError ? profileError.code : "DB_ERROR", hintSaved },
        request,
      });
    }

    if (!profileCreated && !hintSaved) {
      // Nothing to recover from later: do not pretend the account is ready.
      return jsonError(500, "SETUP_INCOMPLETE", "We could not finish setting up the account. Try again later.");
    }

    if (profileCreated) {
      await writeAuditLog({ userId: authUser.id, action: "USER_REGISTERED", resourceType: "user", resourceId: authUser.id, metadata: { accountType: input.accountType }, request });
    }

    const signedIn = Boolean(data.session);
    return jsonOk(
      { needsEmailConfirmation: !signedIn, redirectTo: signedIn ? ROLE_HOME[input.accountType] : undefined },
      201,
    );
  } catch (unexpected) {
    console.error("[register] unexpected failure", unexpected instanceof Error ? unexpected.name : "unknown");
    return jsonError(500, "SERVER_ERROR", "Something went wrong. Try again shortly.");
  }
}
