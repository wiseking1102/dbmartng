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

  // Get user AFTER successful session exchange
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("Get user error:", userError);
    return NextResponse.redirect(`${origin}/auth?error=no_user`);
  }

  // FIX 1: Check users table for role
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  let role = profile?.role;

  // FIX 2: If no role in users table, check user_metadata (for newly signed-up users)
  if (!role && user.user_metadata?.role) {
    role = user.user_metadata.role;
    
    // Sync to users table for next time
    await supabase
      .from("users")
      .update({ role })
      .eq("id", user.id);
  }

  // FIX 3: If still no role, check if user has a vendor profile
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

  // Redirect based on resolved role
` fallback

Your callback only checks the `users` table and `admin_allowlist`. But your `useAuth.ts` sign-in flow also checks `user_metadata` for role. If a vendor signed up via Google and their role is only in `user_metadata` (not the `users` table yet), they'll fall through to the default `next` redirect — which could be `/` or `/auth`, causing a loop.

## Bug 2: `next` parameter default is `/` — could loop to homepage

If `next` is `/` and the user isn't properly routed, they hit the homepage, which might redirect back to `/auth` if you have logic there.

---

## Fixed `src/app/api/auth/callback/route.ts`

Replace the entire file:

```typescript
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

  // Get user AFTER successful session exchange
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("Get user error:", userError);
    return NextResponse.redirect(`${origin}/auth?error=no_user`);
  }

  // FIX 1: Check users table for role
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  let role = profile?.role;

  // FIX 2: If no role in users table, check user_metadata (for newly signed-up users)
  if (!role && user.user_metadata?.role) {
    role = user.user_metadata.role;
    
    // Sync to users table for next time
    await supabase
      .from("users")
      .update({ role })
      .eq("id", user.id);
  }

  // FIX 3: If still no role, check if user has a vendor profile
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

  // Redirect based on resolved role
  if (role === "admin" || role === "sub_admin") {
    return NextResponse.redirect(`${origin}/dashboard/admin`);
  }

  if (role === "vendor") {
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

  // FIX 4: Default redirect to /dashboard instead of /
  return NextResponse.redirect(`${origin}/dashboard`);
}
