import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

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

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("Get user error:", userError);
    return NextResponse.redirect(`${origin}/auth?error=no_user`);
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  let role = profile?.role;

  if (!role && user.user_metadata?.role) {
    role = user.user_metadata.role;
    await supabase
      .from("users")
      .update({ role })
      .eq("id", user.id);
  }

  if (!role) {
    const { data: vendorProfile } = await supabase
      .from("vendor_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (vendorProfile) {
      role = "vendor";
      await supabase
        .from("users")
        .update({ role: "vendor" })
        .eq("id", user.id);
    }
  }

  if (role === "admin" || role === "sub_admin") {
    return NextResponse.redirect(`${origin}/dashboard/admin`);
  }

  if (role === "vendor") {
    return NextResponse.redirect(`${origin}/dashboard/vendor`);
  }

  if (user.email) {
    try {
      const { data: allowlistEntry } = await supabase
        .from("admin_allowlist")
        .select("claimed")
        .eq("identifier", user.email)
        .maybeSingle();

      if (allowlistEntry?.claimed) {
        await supabase
          .from("users")
          .update({ role: "admin" })
          .eq("id", user.id);

        return NextResponse.redirect(`${origin}/dashboard/admin`);
      }
    } catch (err) {
      console.error("Admin allowlist check error:", err);
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
