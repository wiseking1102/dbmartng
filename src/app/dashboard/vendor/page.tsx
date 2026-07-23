"use client";

import { useAuth } from "@/hooks/useAuth";
// ... other imports

export default function VendorDashboardPage() {
  const { user, role, loading } = useAuth();

  // FIX: Don't render or redirect while auth state is still loading.
  // This prevents flashing content then bouncing.
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return null; // Middleware will handle redirect to /auth
  }

  if (role !== "vendor" && role !== "admin" && role !== "sub_admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Access denied. This page is for vendors only.</p>
      </div>
    );
  }

  // ... your actual dashboard content
}
