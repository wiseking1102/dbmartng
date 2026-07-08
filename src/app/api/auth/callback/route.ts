import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
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

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Check admin allowlist
      if (user?.email) {
        const { data: allowlistEntry } = await supabase
          .from("admin_allowlist")
          .select()
          .eq("identifier", user.email)
          .single();

        if (allowlistEntry?.claimed) {
          return NextResponse.redirect(`${origin}/dashboard/admin`);
        }
      }

      // Redirect based on role
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user?.id)
        .single();

      if (profile?.role === "vendor") {
        return NextResponse.redirect(`${origin}/dashboard/vendor`);
      }
      if (profile?.role === "admin") {
        return NextResponse.redirect(`${origin}/dashboard/admin`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=auth_callback_error`);
}
