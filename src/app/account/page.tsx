"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

type UserRole = "buyer" | "vendor" | "admin" | "sub_admin";

const ROLE_ROUTES: Record<UserRole, string> = {
  buyer: "/dashboard/buyer",
  vendor: "/dashboard/vendor",
  admin: "/dashboard/admin",
  sub_admin: "/dashboard/admin",
};

function isValidRole(role: unknown): role is UserRole {
  return (
    role === "buyer" ||
    role === "vendor" ||
    role === "admin" ||
    role === "sub_admin"
  );
}

export default function AccountRedirectPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Not authenticated
    if (!user) {
      router.replace("/auth");
      return;
    }

    // Do not silently turn an unknown role into a buyer.
    if (!isValidRole(role)) {
      return;
    }

    router.replace(ROLE_ROUTES[role]);
  }, [user, role, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
      <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
    </div>
  );
}