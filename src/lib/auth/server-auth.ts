import { createAdminClient } from "@/lib/supabase/admin";

export type AuthUser = {
  id: string;
  email: string | null;
};

/**
 * Resolve the authenticated user from a bearer token.
 * Shared by messaging/upload/contact endpoints so identity
 * always comes from the session, never the request body.
 */
export async function getBearerUser(
  request: Request
): Promise<AuthUser | null> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice("Bearer ".length).trim();

  if (!token) {
    return null;
  }

  try {
    const adminClient = createAdminClient() as any;

    const { data, error } = await adminClient.auth.getUser(token);

    if (error || !data?.user) {
      return null;
    }

    return {
      id: data.user.id,
      email: data.user.email ?? null,
    };
  } catch (error) {
    console.error("Bearer authentication error:", error);
    return null;
  }
}
