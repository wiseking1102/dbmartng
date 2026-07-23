"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
// ... keep all your other imports

export default function AuthPage() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", session.user.id)
          .single();

        // FIX: Type assertion to bypass generated types issue
        const role = (profile as { role: string | null } | null)?.role;

        if (role === "admin" || role === "sub_admin") {
          router.replace("/dashboard/admin");
        } else if (role === "vendor") {
          router.replace("/dashboard/vendor");
        } else {
          router.replace("/dashboard");
        }
      }
    };

    checkSession();
  }, [router]);

  // ... your existing JSX below
}
