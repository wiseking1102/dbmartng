"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import StaggerEntrance from "@/components/animations/StaggerEntrance";
import {
  Store,
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  Clock,
  Shield,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface VendorUser {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface Category {
  name: string;
  slug: string;
  type: string;
}

interface VendorProfile {
  id: string;
  user_id: string;
  business_name: string;
  slug: string;
  description: string | null;
  email: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  is_verified: boolean;
  subscription_status: string;
  trial_decision: string | null;
  created_at: string;
  users: VendorUser;
  categories: Category | null;
}

export default function AdminVendorsPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchVendors = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingVendors(true);
      const res = await fetch(`/api/admin/vendors?status=${statusFilter}`);
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

  const handleAction = async (
    vendorId: string,
    action: "approve" | "reject"
  ) => {
    if (action === "reject" && !rejectReason.trim()) {
      setShowRejectModal(vendorId);
      return;
    }
    
    setActionLoading(vendorId);
    try {
      const res = await fetch("/api/admin/vendors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId,
          action,
          adminUserId: user?.id,
          reason: rejectReason.trim() || undefined,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(
          action === "approve"
            ? "Vendor approved successfully"
            : "Vendor application rejected"
        );
        setShowRejectModal(null);
        setRejectReason("");
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
                  Vendor Applications
                </h1>
              </div>
              <p className="text-gray-500">
                Review and approve/reject new vendor registrations
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === "pending" ? "primary" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("pending")}
              >
                <Clock className="h-4 w-4" />
                Pending
              </Button>
              <Button
                variant={statusFilter === "verified" ? "primary" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("verified")}
              >
                <CheckCircle className="h-4 w-4" />
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
              <Store className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-brand-navy mb-1">
                No vendors found
              </h3>
              <p className="text-gray-500">
                {statusFilter === "pending"
                  ? "All vendor applications have been reviewed."
                  : "No vendors match your search criteria."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredVendors.map((vendor) => (
                <div
                  key={vendor.id}
                  className="glass rounded-2xl p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Vendor Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-brand-navy/5 flex items-center justify-center flex-shrink-0">
                          <Store className="h-6 w-6 text-brand-navy" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-brand-navy text-lg truncate">
                            {vendor.business_name}
                          </h3>
                          {vendor.users?.full_name && (
                            <p className="text-sm text-gray-500">
                              {vendor.users.full_name}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-2 text-sm">
                        {vendor.users?.email && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Mail className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                            <span className="truncate">
                              {vendor.users.email}
                            </span>
                          </div>
                        )}
                        {(vendor.phone || vendor.users?.phone) && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                            <span>{vendor.phone || vendor.users?.phone}</span>
                          </div>
                        )}
                        {(vendor.city || vendor.state) && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                            <span>
                              {[vendor.city, vendor.state]
                                .filter(Boolean)
                                .join(", ")}
                            </span>
                          </div>
                        )}
                        {vendor.categories?.name && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Shield className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                            <span>{vendor.categories.name}</span>
                          </div>
                        )}
                        {vendor.description && (
                          <p className="text-gray-500 col-span-full mt-1 line-clamp-2">
                            {vendor.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex flex-row lg:flex-col items-center lg:items-end gap-3 lg:min-w-[180px]">
                      {/* Status Badge */}
                      <div
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                          vendor.is_verified
                            ? "bg-accent-success/10 text-accent-success"
                            : "bg-accent-warning/10 text-accent-warning"
                        }`}
                      >
                        {vendor.is_verified ? (
                          <>
                            <CheckCircle className="h-3.5 w-3.5" />
                            Verified
                          </>
                        ) : (
                          <>
                            <Clock className="h-3.5 w-3.5" />
                            Pending Review
                          </>
                        )}
                      </div>

                      {/* Subscription Tiers */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span
                          className={`px-2 py-0.5 rounded-full font-medium ${
                            vendor.subscription_status === "pro"
                              ? "bg-brand-gold/10 text-brand-gold"
                              : vendor.subscription_status === "trial"
                                ? "bg-accent-info/10 text-accent-info"
                                : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {vendor.subscription_status === "pro"
                            ? "Pro"
                            : vendor.subscription_status === "trial"
                              ? "Trial"
                              : vendor.subscription_status}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      {!vendor.is_verified && (
                        <div className="flex lg:flex-col gap-2 w-full">
                          <Button
                            variant="primary"
                            size="sm"
                            className="flex-1 lg:w-full"
                            onClick={() => handleAction(vendor.id, "approve")}
                            disabled={actionLoading === vendor.id}
                          >
                            {actionLoading === vendor.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                            Approve
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            className="flex-1 lg:w-full"
                            onClick={() => setShowRejectModal(vendor.id)}
                            disabled={actionLoading === vendor.id}
                          >
                            {actionLoading === vendor.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            Reject
                          </Button>
                        </div>
                      )}

                      {vendor.is_verified && (
                        <div className="flex items-center gap-1 text-xs text-accent-success">
                          <CheckCircle className="h-3 w-3" />
                          Approved
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Rejection Reason Modal */}
          {showRejectModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
                <h3 className="font-bold text-brand-navy text-lg mb-2">
                  Reject Vendor Application
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Provide a reason for rejection. This helps the vendor understand why their
                  application was not approved.
                </p>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold resize-none mb-4"
                />
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowRejectModal(null);
                      setRejectReason("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleAction(showRejectModal, "reject")}
                    disabled={!rejectReason.trim()}
                  >
                    <XCircle className="h-4 w-4" />
                    Reject Application
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
