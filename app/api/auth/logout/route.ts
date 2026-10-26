import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/security/audit";
import { isSameOrigin, jsonError, jsonOk } from "@/lib/security/http";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, "BAD_ORIGIN", "Request origin not allowed.");

  const authUser = await getAuthUser();
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  if (authUser) {
    await writeAuditLog({ userId: authUser.id, action: "USER_LOGOUT", resourceType: "user", resourceId: authUser.id, request });
  }

  // HTML form posts get a redirect; fetch() callers asking for JSON get JSON.
  if (request.headers.get("accept")?.includes("application/json")) return jsonOk({ signedOut: true });
  // isSameOrigin() validates the Origin against the forwarded/host header above. Prefer that
  // public origin because request.url can contain an internal proxy URL (for example localhost).
  const redirectBase = request.headers.get("origin") ?? request.url;
  return NextResponse.redirect(new URL("/login", redirectBase), 303);
}
