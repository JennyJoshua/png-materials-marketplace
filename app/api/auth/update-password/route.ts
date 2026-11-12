import { createSupabaseServerClient } from "@/lib/supabase/server";
import { passwordUpdateSchema } from "@/lib/validation/auth";
import { isSameOrigin, jsonError, jsonOk, readJson } from "@/lib/security/http";
import { logServerError } from "@/lib/security/log";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, "BAD_ORIGIN", "Request origin not allowed.");
  const parsed = passwordUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(400, "VALIDATION_ERROR", "Choose a password of at least 10 characters containing a letter and a number, and confirm it.");

  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return jsonError(401, "RECOVERY_SESSION_REQUIRED", "Open the latest password recovery link from your email, then try again.");

    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) {
      logServerError("password update: Supabase rejected password change", error);
      return jsonError(400, "PASSWORD_UPDATE_FAILED", "We could not update that password. Choose a stronger password or request a new recovery link.");
    }

    await supabase.auth.signOut();
    return jsonOk({ updated: true, redirectTo: "/admin/login" });
  } catch (error) {
    logServerError("password update: unexpected failure", error);
    return jsonError(500, "PASSWORD_UPDATE_FAILED", "We could not update your password. Please request a new recovery link.");
  }
}
