"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import StaggerEntrance from "@/components/animations/StaggerEntrance";
import {
  Shield,
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  Star,
  Store,
  RefreshCw,
  Award,
  Ban,
} from "lucide-react";
import { toast } from "sonner";

interface BadgeVendor {
  id: string;
  business_name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  is_verified: boolean;
  verified_badge_granted_at: string | null;
  is_vip: boolean;
  created_at: string;
  users: {
    id: string;
    email: string | null;
    full_name: string | null;
  };
}

type FilterTab = "unverified" | "verified" | "all";

export default function AdminBadgesPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [vendors, setVendors] = useState<BadgeVendor[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterTab>("unverified");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    vendorId: string;
    businessName: string;
    action: "grant" | "revoke";
  } | null>(null);

  const fetchVendors = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingVendors(true);
      const res = await fetch(`/api/admin/badges?status=${statusFilter}`);
      const result = await res.json();
      if (result.success) {
        setVendors(result.data);
      } else {
        toast.error("Failed to load vendors");
      }
    } catch {
      toast.error("Failed to load vendors");
    } finally {
      setLoadingVendors(false);
    }
  }, [user, statusFilter]);

  useEffect(() => {
    if (!loading && (!user || role !== "admin")) {
      router.push("/auth");
    }
  }, [user, role, loading, router]);

  useEffect(() => {
    if (user && role === "admin") {
      fetchVendors();
    }
  }, [user, role, fetchVendors]);

  const handleBadgeAction = async (
    vendorId: string,
    action: "grant" | "revoke"
  ) => {
    setActionLoading(vendorId);
    try {
      const res = await fetch("/api/admin/badges", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId,
          action,
          adminUserId: user?.id,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(
          action === "grant"
            ? "Verified badge granted"
            : "Verified badge revoked"
        );
        setConfirmAction(null);
        fetchVendors();
      } else {
        toast.error(result.error || "Action failed");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredVendors = vendors.filter((v) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      v.business_name.toLowerCase().includes(q) ||
      v.users?.email?.toLowerCase().includes(q) ||
      v.users?.full_name?.toLowerCase().includes(q) ||
      v.city?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <>
        <Header />
        <div className="pt-20 min-h-screen flex items-center justify-center">
          <div className="animate-pulse-soft text-brand-navy font-semibold">
            Loading admin panel...
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen bg-surface-secondary">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <StaggerEntrance>
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href="/dashboard/admin"
                  className="text-gray-400 hover:text-brand-navy transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy font-display">
                  Badge Management
                </h1>
              </div>
              <p className="text-gray-500">
                Grant and revoke verified badges for vendors
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchVendors}>
              <RefreshCw className={`h-4 w-4 ${loadingVendors ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>



          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={statusFilter === "unverified" ? "primary" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("unverified")}
            >
              <Shield className="h-4 w-4" />
              Unverified
            </Button>
            <Button
              variant={statusFilter === "verified" ? "primary" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("verified")}
            >
              <Award className="h-4 w-4" />
              Verified
            </Button>
            <Button
              variant={statusFilter === "all" ? "primary" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
            >
              <Store className="h-4 w-4" />
              All
            </Button>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by business name, email, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all"
            />
          </div>

          {/* Vendor List */}
          {loadingVendors ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Shield className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-brand-navy mb-1">
                No vendors found
              </h3>
              <p className="text-gray-500">
                {statusFilter === "unverified"
                  ? "All vendors have been verified."
                  : "No vendors match your search."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredVendors.map((vendor) => (
                <div
                  key={vendor.id}
                  className="glass rounded-2xl p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      {/* Badge Icon */}
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          vendor.is_verified
                            ? "bg-accent-success/10"
                            : "bg-gray-100"
                        }`}
                      >
                        {vendor.is_verified ? (
                          <Award className="h-6 w-6 text-accent-success" />
                        ) : (
                          <Shield className="h-6 w-6 text-gray-400" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-bold text-brand-navy truncate">
                            {vendor.business_name}
                          </h3>
                          {vendor.is_vip && (
                            <Star className="h-4 w-4 text-brand-gold fill-brand-gold" />
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-gray-500">
                          {vendor.users?.full_name && (
                            <span>{vendor.users.full_name}</span>
                          )}
                          {vendor.users?.email && (
                            <span className="text-gray-400">
                              {vendor.users.email}
                            </span>
                          )}
                          {(vendor.city || vendor.state) && (
                            <span className="text-gray-400">
                              {[vendor.city, vendor.state]
                                .filter(Boolean)
                                .join(", ")}
                            </span>
                          )}
                        </div>
                        {vendor.verified_badge_granted_at && (
                          <p className="text-xs text-accent-success mt-0.5">
                            Badge granted:{" "}
                            {new Date(
                              vendor.verified_badge_granted_at
                            ).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action */}
                    <div className="flex-shrink-0">
                      {vendor.is_verified ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-accent-error border-accent-error/30 hover:bg-accent-error/5"
                          onClick={() =>
                            setConfirmAction({
                              vendorId: vendor.id,
                              businessName: vendor.business_name,
                              action: "revoke",
                            })
                          }
                          disabled={actionLoading === vendor.id}
                        >
                          {actionLoading === vendor.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Ban className="h-4 w-4" />
                          )}
                          Revoke Badge
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() =>
                            setConfirmAction({
                              vendorId: vendor.id,
                              businessName: vendor.business_name,
                              action: "grant",
                            })
                          }
                          disabled={actionLoading === vendor.id}
                        >
                          {actionLoading === vendor.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Award className="h-4 w-4" />
                          )}
                          Grant Badge
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Confirmation Modal */}
          {confirmAction && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                    confirmAction.action === "grant"
                      ? "bg-accent-success/10"
                      : "bg-accent-error/10"
                  }`}
                >
                  {confirmAction.action === "grant" ? (
                    <Award className="h-7 w-7 text-accent-success" />
                  ) : (
                    <Ban className="h-7 w-7 text-accent-error" />
                  )}
                </div>
                <h3 className="font-bold text-brand-navy text-lg text-center mb-2">
                  {confirmAction.action === "grant"
                    ? "Grant Verified Badge"
                    : "Revoke Verified Badge"}
                </h3>
                <p className="text-sm text-gray-500 text-center mb-6">
                  {confirmAction.action === "grant" ? (
                    <>
                      Are you sure you want to grant a verified badge to{" "}
                      <strong>{confirmAction.businessName}</strong>? This will
                      publicly mark them as a trusted vendor on the platform.
                    </>
                  ) : (
                    <>
                      Are you sure you want to revoke the verified badge from{" "}
                      <strong>{confirmAction.businessName}</strong>? They will
                      lose the verified trust indicator.
                    </>
                  )}
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setConfirmAction(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant={
                      confirmAction.action === "grant" ? "primary" : "danger"
                    }
                    className="flex-1"
                    onClick={() =>
                      handleBadgeAction(
                        confirmAction.vendorId,
                        confirmAction.action
                      )
                    }
                  >
                    {confirmAction.action === "grant"
                      ? "Grant Badge"
                      : "Revoke Badge"}
                  </Button>
                </div>
              </div>
            </div>
          )}
          </StaggerEntrance>
        </div>
      </main>
    </>
  );
}
