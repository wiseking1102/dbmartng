import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type UserRole = "buyer" | "vendor" | "admin" | "sub_admin";

const ROLE_ROUTES: Record<UserRole, string> = {
  buyer: "/dashboard/buyer",
  vendor: "/dashboard/vendor",
  admin: "/dashboard/admin",
  sub_admin: "/dashboard/admin",
};

function getRoleFromPath(pathname: string): UserRole | null {
  if (pathname.startsWith("/dashboard/admin") || pathname.startsWith("/admin")) {
    return "admin";
  }

  if (pathname.startsWith("/dashboard/vendor")) {
    return "vendor";
  }

  if (pathname.startsWith("/dashboard/buyer")) {
    return "buyer";
  }

  return null;
}

function isRoleAllowed(role: UserRole, requiredRole: UserRole): boolean {
  if (requiredRole === "admin") {
    return role === "admin" || role === "sub_admin";
  }

  return role === requiredRole;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[]
        ) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  /*
   * IMPORTANT:
   * Use getUser() for server-side authentication.
   * Do not trust client-side state or localStorage for protected routes.
   */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  /*
   * All protected application areas.
   */
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/admin");

  /*
   * Not authenticated:
   * send the user to auth and preserve the destination.
   */
  if (isProtected && !user) {
    const url = request.nextUrl.clone();

    url.pathname = "/auth";
    url.searchParams.set(
      "redirect",
      `${pathname}${request.nextUrl.search}`
    );

    return NextResponse.redirect(url);
  }

  /*
   * If this is not a role-specific dashboard/admin route,
   * authentication protection above is enough.
   */
  const requiredRole = getRoleFromPath(pathname);

  if (!requiredRole || !user) {
    return response;
  }

  /*
   * Resolve the authoritative application role from public.users.
   */
  const { data: profile, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  /*
   * If the profile cannot be resolved, do NOT send the user
   * to a random dashboard.
   *
   * Send them to /account, which is protected but not tied
   * to a particular role.
   */
  if (error || !profile?.role) {
    const url = request.nextUrl.clone();
    url.pathname = "/account";
    url.search = "";

    return NextResponse.redirect(url);
  }

  const role = profile.role as UserRole;

  /*
   * Only accept roles that the application understands.
   */
  if (!["buyer", "vendor", "admin", "sub_admin"].includes(role)) {
    const url = request.nextUrl.clone();
    url.pathname = "/account";
    url.search = "";

    return NextResponse.redirect(url);
  }

  /*
   * Check whether the authenticated user's role is allowed
   * to access the requested area.
   */
  if (!isRoleAllowed(role, requiredRole)) {
    const destination = ROLE_ROUTES[role];

    const url = request.nextUrl.clone();
    url.pathname = destination;
    url.search = "";

    return NextResponse.redirect(url);
  }

  /*
   * User is authenticated and authorized.
   */
  return response;
}

export const config = {
  matcher: [
    /*
     * Run middleware on application routes while excluding
     * static assets and Next.js internals.
     */
    "/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};