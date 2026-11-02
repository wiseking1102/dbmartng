import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";

const VALID_ROLES = ["buyer", "vendor", "admin", "sub_admin"];

/**
 * POST /api/auth/session-role
 *
 * Resolves the authenticated user's application role for
 * cookie-based sessions (no bearer token required).
 *
 * Used as a last-step fallback by vendor onboarding when the
 * client-side role lookups all failed, so a vendor is never
 * thrown out of registration by a transient race.
 *
 * Security:
 * - The server verifies the session cookie via getUser() —
 *   the client cannot request another account's role.
 * - The role itself is read with the service-role client so a
 *   temporary RLS limitation cannot block a legitimate resolution.
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Server Component context — safe to ignore.
            }
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    const { data: profileData, error } = await adminClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Role lookup error:", error);
      return NextResponse.json(
        { error: "Unable to resolve role" },
        { status: 500 }
      );
    }

    const role = (profileData as { role?: string } | null)?.role ?? null;

    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: "Role not resolved" },
        { status: 404 }
      );
    }

    return NextResponse.json({ role });
  } catch (error) {
    console.error("Session role API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
