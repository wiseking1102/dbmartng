import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/auth?error=no_code`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component context
          }
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(`${origin}/auth?error=auth_callback_error`);
  }

  // Get user AFTER successful session exchange
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("Get user error:", userError);
    return NextResponse.redirect(`${origin}/auth?error=no_user`);
  }

  // First: check users table for role (most reliable)
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  // Redirect based on role from users table
  if (profile?.role === "admin") {
    return NextResponse.redirect(`${origin}/dashboard/admin`);
  }

  if (profile?.role === "vendor") {
    return NextResponse.redirect(`${origin}/dashboard/vendor`);
  }

  // Fallback: check admin allowlist for legacy admin detection
  if (user.email) {
    try {
      const { data: allowlistEntry } = await supabase
        .from("admin_allowlist")
        .select("claimed")
        .eq("identifier", user.email)
        .maybeSingle();

      if (allowlistEntry?.claimed) {
        // Update user role to admin if not already set
        await supabase
          .from("users")
          .update({ role: "admin" })
          .eq("id", user.id);
        
        return NextResponse.redirect(`${origin}/dashboard/admin`);
      }
    } catch (err) {
      console.error("Admin allowlist check error:", err);
      // Continue to default redirect
    }
  }

  // Default redirect
  return NextResponse.redirect(`${origin}${next}`);
}