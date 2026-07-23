"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
// ... keep your other imports

export default function AuthPage() {
  const router = useRouter();

  // FIX: If user is already logged in, redirect them to their dashboard
  // instead of showing the auth selection screen.
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

        const role = profile?.role;

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

  // ... rest of your existing JSX
}
