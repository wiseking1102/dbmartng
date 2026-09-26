import { createAdminClient } from "@/lib/supabase/admin";

type AdminUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: "admin" | "sub_admin";
};

export async function authenticateAdmin(
  request: Request,
  requiredPermission?: string
): Promise<AdminUser | null> {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return null;
    }

    const token = authorization.slice("Bearer ".length).trim();

    if (!token) {
      return null;
    }

    const supabase = createAdminClient() as any;

    const {
      data: authData,
      error: authError,
    } = await supabase.auth.getUser(token);

    const user = authData?.user;

    if (authError || !user) {
      return null;
    }

    const {
      data: profileData,
      error: profileError,
    } = await supabase
      .from("users")
      .select("role, full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profileData) {
      return null;
    }

    const role = profileData.role as string | null;

    if (role !== "admin" && role !== "sub_admin") {
      return null;
    }

    if (requiredPermission && role !== "admin") {
      const { data: permitted } = await supabase
        .from("sub_admin_permissions")
        .select(
          "id, granted, sub_admins!inner(user_id, status)"
        )
        .eq("permission_key", requiredPermission)
        .eq("granted", true)
        .eq("sub_admins.user_id", user.id)
        .eq("sub_admins.status", "active")
        .limit(1);

      const rows =
        (permitted as unknown as { id: string }[] | null) || [];

      if (rows.length === 0) {
        return null;
      }
    }

    return {
      id: user.id,
      email: user.email ?? null,
      full_name: profileData.full_name ?? null,
      role: role as "admin" | "sub_admin",
    };
  } catch (error) {
    console.error("Admin authentication error:", error);
    return null;
  }
}
