"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import StaggerEntrance from "@/components/animations/StaggerEntrance";
import {
  AlertTriangle,
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  Clock,
  RefreshCw,
  Scale,
  UserX,
  Store,
  Search as SearchIcon,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────

interface VendorBrief {
  id: string;
  business_name: string;
  slug: string;
  city: string | null;
  state: string | null;
  is_verified: boolean;
  complaint_count: number;
}

interface UserBrief {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface Complaint {
  id: string;
  vendor_id: string;
  buyer_id: string;
  reason: string;
  status: "open" | "investigating" | "resolved" | "dismissed";
  resolved_by: string | null;
  created_at: string;
  vendor: VendorBrief;
  buyer: UserBrief;
  resolver: UserBrief | null;
}

type StatusTab = "open" | "investigating" | "resolved" | "dismissed" | "all";

// ─── Component ───────────────────────────────────────────────

export default function AdminReportsPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusTab>("open");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDismissModal, setShowDismissModal] = useState<string | null>(null);
  const [dismissReason, setDismissReason] = useState("");

  const fetchComplaints = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingComplaints(true);
      const res = await fetch(`/api/admin/reports?status=${statusFilter}`);
      const result = await res.json();
      if (result.success) {
        setComplaints(result.data);
      } else {
        toast.error("Failed to load complaints");
      }
    } catch {
      toast.error("Failed to load complaints");
    } finally {
      setLoadingComplaints(false);
    }
  }, [user, statusFilter]);

  useEffect(() => {
    if (!loading && (!user || role !== "admin")) {
      router.push("/auth");
    }
  }, [user, role, loading, router]);

  useEffect(() => {
    if (user && role === "admin") {
      fetchComplaints();
    }
  }, [user, role, fetchComplaints]);

  const handleAction = async (
    complaintId: string,
    action: "investigate" | "resolve" | "dismiss"
  ) => {
    if (action === "dismiss" && !dismissReason.trim()) {
      setShowDismissModal(complaintId);
      return;
    }
    
    setActionLoading(complaintId);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaintId,
          action,
          adminUserId: user?.id,
          reason: dismissReason.trim() || undefined,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(
          action === "investigate"
            ? "Marked as investigating"
            : action === "resolve"
              ? "Complaint resolved"
              : "Complaint dismissed"
        );
        setShowDismissModal(null);
        setDismissReason("");
        fetchComplaints();
      } else {
        toast.error(result.error || "Action failed");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredComplaints = complaints.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.vendor?.business_name?.toLowerCase().includes(q) ||
      c.buyer?.full_name?.toLowerCase().includes(q) ||
      c.buyer?.email?.toLowerCase().includes(q) ||
      c.reason.toLowerCase().includes(q)
    );
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "open":
        return { bg: "bg-accent-warning/10", text: "text-accent-warning", icon: Clock, label: "Open" };
      case "investigating":
        return { bg: "bg-accent-info/10", text: "text-accent-info", icon: SearchIcon, label: "Investigating" };
      case "resolved":
        return { bg: "bg-accent-success/10", text: "text-accent-success", icon: CheckCircle, label: "Resolved" };
      case "dismissed":
        return { bg: "bg-gray-100", text: "text-gray-500", icon: XCircle, label: "Dismissed" };
      default:
        return { bg: "bg-gray-100", text: "text-gray-500", icon: Clock, label: status };
    }
  };

  const tabs: { key: StatusTab; label: string; icon: typeof Clock }[] = [
    { key: "open", label: "Open", icon: AlertTriangle },
    { key: "investigating", label: "Investigating", icon: SearchIcon },
    { key: "resolved", label: "Resolved", icon: CheckCircle },
    { key: "dismissed", label: "Dismissed", icon: XCircle },
    { key: "all", label: "All", icon: Scale },
  ];

  if (loading) {
    return (
      <>
        <Header />
        <div className="pt-20 min-h-screen flex items-center justify-center">
          <div className="animate-pulse-soft text-brand-navy font-semibold">Loading admin panel...</div>
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
                <Link href="/dashboard/admin" className="text-gray-400 hover:text-brand-navy transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy font-display">
                  Reports & Disputes
                </h1>
              </div>
              <p className="text-gray-500">Manage vendor complaints and buyer disputes</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchComplaints}>
              <RefreshCw className={`h-4 w-4 ${loadingComplaints ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {tabs.slice(0, 4).map((tab) => {
              const count = complaints.filter((c) => c.status === tab.key).length;
              const config = getStatusConfig(tab.key);
              const Icon = config.icon;
              return (
                <div key={tab.key} className="glass rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`h-5 w-5 ${config.text}`} />
                  </div>
                  <div className="text-2xl font-bold text-brand-navy">{count}</div>
                  <div className="text-xs text-gray-500">{tab.label}</div>
                </div>
              );
            })}
          </div>

          {/* Status Tabs */}
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
              placeholder="Search by vendor, buyer, or complaint reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all"
            />
          </div>

          {/* Complaint List */}
          {loadingComplaints ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Scale className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-brand-navy mb-1">No complaints found</h3>
              <p className="text-gray-500">
                {statusFilter === "open"
                  ? "All complaints have been addressed."
                  : `No ${statusFilter} complaints match your criteria.`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredComplaints.map((complaint) => {
                const statusConfig = getStatusConfig(complaint.status);
                const StatusIcon = statusConfig.icon;

                return (
                  <div
                    key={complaint.id}
                    className={`glass rounded-2xl p-6 hover:shadow-md transition-shadow border-l-4 ${
                      complaint.status === "open"
                        ? "border-l-accent-warning"
                        : complaint.status === "investigating"
                          ? "border-l-accent-info"
                          : complaint.status === "resolved"
                            ? "border-l-accent-success"
                            : "border-l-gray-400"
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row gap-4">
                      {/* Main Content */}
                      <div className="flex-1 min-w-0">
                        {/* Header: Vendor vs Buyer */}
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            complaint.status === "open"
                              ? "bg-accent-warning/10"
                              : complaint.status === "investigating"
                                ? "bg-accent-info/10"
                                : complaint.status === "resolved"
                                  ? "bg-accent-success/10"
                                  : "bg-gray-100"
                          }`}>
                            <AlertTriangle className={`h-5 w-5 ${
                              complaint.status === "open"
                                ? "text-accent-warning"
                                : complaint.status === "investigating"
                                  ? "text-accent-info"
                                  : complaint.status === "resolved"
                                    ? "text-accent-success"
                                    : "text-gray-500"
                            }`} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-sm mb-1">
                              <span className="font-semibold text-brand-navy truncate">
                                {complaint.vendor?.business_name || "Unknown Vendor"}
                              </span>
                              <span className="text-gray-400">vs</span>
                              <span className="font-medium text-gray-600 truncate">
                                {complaint.buyer?.full_name || "Unknown Buyer"}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <Store className="h-3 w-3" />
                                {complaint.vendor?.business_name || "N/A"}
                              </span>
                              <span className="flex items-center gap-1">
                                <UserX className="h-3 w-3" />
                                {complaint.buyer?.email || "N/A"}
                              </span>
                              <span>
                                {new Date(complaint.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Complaint Reason */}
                        <div className="bg-gray-50 rounded-xl p-4 mb-2">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {complaint.reason}
                          </p>
                        </div>

                        {/* Resolver Info */}
                        {complaint.resolver && (
                          <p className="text-xs text-gray-400">
                            Resolved by {complaint.resolver.full_name || complaint.resolver.email}
                          </p>
                        )}
                      </div>

                      {/* Status & Actions */}
                      <div className="flex flex-row lg:flex-col items-center lg:items-end gap-2 lg:min-w-[160px]">
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusConfig.label}
                        </div>

                        {(complaint.status === "open" || complaint.status === "investigating") && (
                          <div className="flex lg:flex-col gap-2 w-full">
                            {complaint.status === "open" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 lg:w-full"
                                onClick={() => handleAction(complaint.id, "investigate")}
                                disabled={actionLoading === complaint.id}
                              >
                                {actionLoading === complaint.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <SearchIcon className="h-4 w-4" />
                                )}
                                Investigate
                              </Button>
                            )}
                            <div className="flex gap-2 flex-1 lg:w-full">
                              {(complaint.status as string) !== "resolved" && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => handleAction(complaint.id, "resolve")}
                                  disabled={actionLoading === complaint.id}
                                >
                                  {actionLoading === complaint.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4" />
                                  )}
                                  Resolve
                                </Button>
                              )}
                              <Button
                                variant="danger"
                                size="sm"
                                className="flex-1"
                                onClick={() => handleAction(complaint.id, "dismiss")}
                                disabled={actionLoading === complaint.id}
                              >
                                {actionLoading === complaint.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <XCircle className="h-4 w-4" />
                                )}
                                Dismiss
                              </Button>
                            </div>
                          </div>
                        )}

                        {complaint.status === "resolved" && (
                          <p className="text-xs text-accent-success">Complaint resolved</p>
                        )}
                        {complaint.status === "dismissed" && (
                          <p className="text-xs text-gray-400">Complaint dismissed</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </StaggerEntrance>
        </div>

          {/* Dismiss Reason Modal */}
          {showDismissModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
                <h3 className="font-bold text-brand-navy text-lg mb-2">Dismiss Complaint</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Provide a reason for dismissing this complaint. This helps maintain transparency.
                </p>
                <textarea
                  value={dismissReason}
                  onChange={(e) => setDismissReason(e.target.value)}
                  placeholder="Enter reason for dismissal..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold resize-none mb-4"
                />
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowDismissModal(null);
                      setDismissReason("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleAction(showDismissModal!, "dismiss")}
                    disabled={!dismissReason.trim()}
                  >
                    <XCircle className="h-4 w-4" />
                    Dismiss Complaint
                  </Button>
                </div>
              </div>
            </div>
          )}
      </main>
    </>
  );
}
