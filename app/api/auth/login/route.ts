import { createSupabaseServerClient } from "@/lib/supabase/server";
import { syncAppUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { loginSchema } from "@/lib/validation/auth";
import { postLoginPath } from "@/lib/roles";
import { loginIpLimiter, loginLimiter } from "@/lib/security/rate-limit";
import { writeAuditLog } from "@/lib/security/audit";
import { getClientIp, isSameOrigin, jsonError, jsonOk, readJson } from "@/lib/security/http";

const INVALID = "Invalid email or password.";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, "BAD_ORIGIN", "Request origin not allowed.");

  const ip = getClientIp(request);
  const parsed = loginSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(400, "VALIDATION_ERROR", "Enter your email and password.");
  const { email, password, next } = parsed.data;

  const ipLimit = loginIpLimiter.check(ip);
  const pairLimit = loginLimiter.check(`${ip}:${email}`);
  if (!ipLimit.allowed || !pairLimit.allowed) {
    const retry = Math.max(ipLimit.retryAfterSeconds, pairLimit.retryAfterSeconds);
    return jsonError(429, "RATE_LIMITED", "Too many sign-in attempts. Try again later.", { "Retry-After": String(retry) });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      if (error?.code === "email_not_confirmed") {
        return jsonError(403, "EMAIL_NOT_CONFIRMED", "Confirm your email address first. Check your inbox for the link.");
      }
      await writeAuditLog({ userId: null, action: "USER_LOGIN_FAILED", request });
      // One generic message for unknown e-mail and wrong password.
      return jsonError(401, "INVALID_CREDENTIALS", INVALID);
    }

    const appUser = await syncAppUser(data.user);
    if (!appUser) {
      await supabase.auth.signOut();
      return jsonError(409, "PROFILE_INCOMPLETE", "Your account setup is incomplete. Contact support.");
    }
    if (appUser.status === "SUSPENDED") {
      await supabase.auth.signOut();
      return jsonError(403, "ACCOUNT_SUSPENDED", "This account is suspended.");
    }

    await prisma.user.update({ where: { id: appUser.id }, data: { lastLoginAt: new Date() } });
    await writeAuditLog({ userId: appUser.id, action: "USER_LOGIN", resourceType: "user", resourceId: appUser.id, request });

    return jsonOk({ redirectTo: postLoginPath(appUser.role, next) });
  } catch (unexpected) {
    console.error("[login] unexpected failure", unexpected instanceof Error ? unexpected.name : "unknown");
    return jsonError(500, "SERVER_ERROR", "Something went wrong. Try again shortly.");
  }
}
