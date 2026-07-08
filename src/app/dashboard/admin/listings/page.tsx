"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import StaggerEntrance from "@/components/animations/StaggerEntrance";
import {
  Package,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Flag,
  Loader2,
  ArrowLeft,
  Clock,
  ExternalLink,
  Eye,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface VendorInfo {
  id: string;
  business_name: string;
  slug: string;
  is_verified: boolean;
  user_id: string;
}

interface Listing {
  id: string;
  vendor_id: string;
  title: string;
  slug: string;
  description: string | null;
  price: number | null;
  price_period: string | null;
  status: "pending_review" | "approved" | "rejected" | "flagged";
  status_reason: string | null;
  is_service: boolean;
  tags: string[];
  view_count: number;
  created_at: string;
  vendor_profiles: VendorInfo;
}

type StatusTab = "pending_review" | "flagged" | "approved" | "rejected" | "all";

export default function AdminListingsPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusTab>("pending_review");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showReasonModal, setShowReasonModal] = useState<{
    listingId: string;
    action: "reject" | "flag";
  } | null>(null);
  const [reasonText, setReasonText] = useState("");

  const fetchListings = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingListings(true);
      const res = await fetch(
        `/api/admin/listings?status=${statusFilter}`
      );
      const result = await res.json();
      if (result.success) {
        setListings(result.data);
      } else {
        toast.error("Failed to load listings");
      }
    } catch {
      toast.error("Failed to load listings");
    } finally {
      setLoadingListings(false);
    }
  }, [user, statusFilter]);

  useEffect(() => {
    if (!loading && (!user || role !== "admin")) {
      router.push("/auth");
    }
  }, [user, role, loading, router]);

  useEffect(() => {
    if (user && role === "admin") {
      fetchListings();
    }
  }, [user, role, fetchListings]);

  const handleAction = async (
    listingId: string,
    action: "approve" | "reject" | "flag" | "clear_flag"
  ) => {
    if ((action === "reject" || action === "flag") && !reasonText.trim()) {
      setShowReasonModal({ listingId, action });
      return;
    }

    setActionLoading(listingId);
    try {
      const res = await fetch("/api/admin/listings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          action,
          adminUserId: user?.id,
          reason: reasonText.trim() || undefined,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(
          action === "approve"
            ? "Listing approved"
            : action === "reject"
              ? "Listing rejected"
              : action === "flag"
                ? "Listing flagged"
                : "Flag cleared"
        );
        setShowReasonModal(null);
        setReasonText("");
        fetchListings();
      } else {
        toast.error(result.error || "Action failed");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredListings = listings.filter((l) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.title.toLowerCase().includes(q) ||
      l.vendor_profiles?.business_name?.toLowerCase().includes(q) ||
      l.description?.toLowerCase().includes(q) ||
      l.tags?.some((t) => t.toLowerCase().includes(q))
    );
  });

  const tabs: { key: StatusTab; label: string; icon: typeof Clock }[] = [
    { key: "pending_review", label: "Pending Review", icon: Clock },
    { key: "flagged", label: "Flagged", icon: Flag },
    { key: "approved", label: "Approved", icon: CheckCircle },
    { key: "rejected", label: "Rejected", icon: XCircle },
    { key: "all", label: "All", icon: Package },
  ];

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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href="/dashboard/admin"
                  className="text-gray-400 hover:text-brand-navy transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy font-display">
                  Listing Verification
                </h1>
              </div>
              <p className="text-gray-500">
                Review and approve/reject/flag product and service listings
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchListings}>
              <RefreshCw className={`h-4 w-4 ${loadingListings ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {tabs.map((tab) => (
              <Button
                key={tab.key}
                variant={statusFilter === tab.key ? "primary" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(tab.key)}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, vendor, description, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all"
            />
          </div>

          {/* Listing Cards */}
          {loadingListings ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-brand-navy mb-1">
                No listings found
              </h3>
              <p className="text-gray-500">
                {statusFilter === "pending_review"
                  ? "All listings have been reviewed."
                  : `No ${statusFilter === "flagged" ? "flagged" : statusFilter} listings.`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredListings.map((listing) => (
                <div
                  key={listing.id}
                  className={`glass rounded-2xl p-6 hover:shadow-md transition-shadow border-l-4 ${
                    listing.status === "pending_review"
                      ? "border-l-accent-warning"
                      : listing.status === "approved"
                        ? "border-l-accent-success"
                        : listing.status === "rejected"
                          ? "border-l-accent-error"
                          : "border-l-accent-warning"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Listing Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-12 h-12 rounded-xl bg-brand-navy/5 flex items-center justify-center flex-shrink-0">
                          <Package className="h-6 w-6 text-brand-navy" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-brand-navy text-lg truncate">
                            {listing.title}
                          </h3>
                          <p className="text-sm text-gray-500">
                            by{" "}
                            <span className="font-medium text-brand-navy">
                              {listing.vendor_profiles?.business_name || "Unknown Vendor"}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mb-2">
                        {listing.price != null && (
                          <span className="font-semibold text-brand-gold">
                            ₦{Number(listing.price).toLocaleString()}
                            {listing.price_period &&
                              `/${listing.price_period}`}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            listing.is_service
                              ? "bg-accent-info/10 text-accent-info"
                              : "bg-accent-success/10 text-accent-success"
                          }`}
                        >
                          {listing.is_service ? "Service" : "Product"}
                        </span>
                        <span className="flex items-center gap-1 text-gray-400">
                          <Eye className="h-3.5 w-3.5" />
                          {listing.view_count} views
                        </span>
                      </div>

                      {listing.description && (
                        <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                          {listing.description}
                        </p>
                      )}

                      {listing.tags && listing.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {listing.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {listing.status_reason && (
                        <div className="mt-2 flex items-start gap-1.5 text-xs text-accent-error bg-accent-error/5 px-3 py-2 rounded-lg">
                          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                          <span>{listing.status_reason}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-row lg:flex-col items-center lg:items-end gap-2 lg:min-w-[160px]">
                      <div
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold mb-1 ${
                          listing.status === "approved"
                            ? "bg-accent-success/10 text-accent-success"
                            : listing.status === "rejected"
                              ? "bg-accent-error/10 text-accent-error"
                              : listing.status === "flagged"
                                ? "bg-accent-warning/10 text-accent-warning"
                                : "bg-accent-warning/10 text-accent-warning"
                        }`}
                      >
                        {listing.status === "approved" ? (
                          <CheckCircle className="h-3.5 w-3.5" />
                        ) : listing.status === "rejected" ? (
                          <XCircle className="h-3.5 w-3.5" />
                        ) : listing.status === "flagged" ? (
                          <Flag className="h-3.5 w-3.5" />
                        ) : (
                          <Clock className="h-3.5 w-3.5" />
                        )}
                        {listing.status === "pending_review"
                          ? "Pending"
                          : listing.status.charAt(0).toUpperCase() +
                            listing.status.slice(1)}
                      </div>

                      {(listing.status === "pending_review" ||
                        listing.status === "flagged") && (
                        <div className="flex lg:flex-col gap-2 w-full">
                          <Button
                            variant="primary"
                            size="sm"
                            className="flex-1 lg:w-full"
                            onClick={() =>
                              handleAction(listing.id, "approve")
                            }
                            disabled={actionLoading === listing.id}
                          >
                            {actionLoading === listing.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                            Approve
                          </Button>
                          <div className="flex gap-2 flex-1 lg:w-full">
                            <Button
                              variant="danger"
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                setShowReasonModal({
                                  listingId: listing.id,
                                  action: "reject",
                                });
                              }}
                              disabled={actionLoading === listing.id}
                            >
                              <XCircle className="h-4 w-4" />
                              Reject
                            </Button>
                            {listing.status !== "flagged" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => {
                                  setShowReasonModal({
                                    listingId: listing.id,
                                    action: "flag",
                                  });
                                }}
                                disabled={actionLoading === listing.id}
                              >
                                <Flag className="h-4 w-4" />
                                Flag
                              </Button>
                            )}
                          </div>
                          {listing.status === "flagged" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="lg:w-full"
                              onClick={() =>
                                handleAction(listing.id, "clear_flag")
                              }
                              disabled={actionLoading === listing.id}
                            >
                              <RefreshCw className="h-4 w-4" />
                              Clear Flag
                            </Button>
                          )}
                        </div>
                      )}

                      {listing.status === "approved" && (
                        <div className="flex lg:flex-col gap-2 w-full">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 lg:w-full"
                            onClick={() => {
                              setShowReasonModal({
                                listingId: listing.id,
                                action: "flag",
                              });
                            }}
                            disabled={actionLoading === listing.id}
                          >
                            <Flag className="h-4 w-4" />
                            Flag
                          </Button>
                        </div>
                      )}

                      {listing.status === "rejected" && (
                        <p className="text-xs text-gray-400 text-center">
                          Reviewed by admin
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reason Modal */}
          {showReasonModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
                <h3 className="font-bold text-brand-navy text-lg mb-2">
                  {showReasonModal.action === "reject"
                    ? "Reject Listing"
                    : "Flag Listing"}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {showReasonModal.action === "reject"
                    ? "Provide a reason for rejection. The vendor will see this."
                    : "Why are you flagging this listing for review?"}
                </p>
                <textarea
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  placeholder="Enter reason..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold resize-none mb-4"
                />
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowReasonModal(null);
                      setReasonText("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant={showReasonModal.action === "reject" ? "danger" : "primary"}
                    size="sm"
                    onClick={() =>
                      handleAction(
                        showReasonModal.listingId,
                        showReasonModal.action
                      )
                    }
                    disabled={!reasonText.trim()}
                  >
                    {showReasonModal.action === "reject"
                      ? "Reject"
                      : "Flag"}
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
