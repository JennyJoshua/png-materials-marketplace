import { requireApiAccess } from "@/lib/auth/guards";
import { jsonOk } from "@/lib/security/http";

/**
 * The signed-in user's own application profile. There is deliberately NO id parameter: the user is
 * always the verified Supabase identity, so changing an id in the URL cannot reach another user.
 */
export async function GET() {
  const { user, response } = await requireApiAccess();
  if (response) return response;
  return jsonOk({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
  });
}
