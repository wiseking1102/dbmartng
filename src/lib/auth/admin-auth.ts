import { createAdminClient } from "@/lib/supabase/admin";

export type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
};

export async function authenticateAdmin(
  accessToken: string
): Promise<AdminUser | null> {
  if (!accessToken) {
    return null;
  }

  const supabase = createAdminClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    return null;
  }

  const { data: adminUser, error: adminError } = await supabase
    .from("users")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (adminError || !adminUser) {
    return null;
  }

  return adminUser;
}
