"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function AccountRedirectPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/auth");
      } else if (role === "admin" || role === "sub_admin") {
        router.replace("/dashboard/admin");
      } else if (role === "vendor") {
        router.replace("/dashboard/vendor");
      } else {
        router.replace("/dashboard/buyer");
      }
    }
  }, [user, role, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
      <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
    </div>
  );
}
