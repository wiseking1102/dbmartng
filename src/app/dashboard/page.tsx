import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function DashboardRootPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = (profile as { role: string | null } | null)?.role;

  if (role === "admin" || role === "sub_admin") {
    redirect("/dashboard/admin");
  } else if (role === "vendor") {
    redirect("/dashboard/vendor");
  } else if (role === "buyer") {
    redirect("/dashboard/buyer");
  } else {
    redirect("/");
  }
}
