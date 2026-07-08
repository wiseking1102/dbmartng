"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import StaggerEntrance from "@/components/animations/StaggerEntrance";
import {
  Megaphone,
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  Clock,
  ExternalLink,
  RefreshCw,
  Plus,
  Image as ImageIcon,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  DollarSign,
  Store,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────

interface VendorInfo {
  id: string;
  business_name: string;
  slug: string;
  city: string | null;
  state: string | null;
  is_verified: boolean;
}

interface AdRequest {
  id: string;
  vendor_id: string;
  target_type: "listing" | "bundle" | "account";
  target_ids: string[];
  status: "pending" | "approved" | "rejected" | "expired";
  duration_days: number;
  price_paid: number;
  paystack_reference: string | null;
  approved_by: string | null;
  approved_at: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  vendor_profiles: VendorInfo;
}

interface CreatorUser {
  id: string;
  email: string | null;
  full_name: string | null;
}

interface CompanyAd {
  id: string;
  title: string;
  banner_url: string | null;
  destination_url: string;
  created_by: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  created_at: string;
  creator: CreatorUser;
}

type Tab = "requests" | "company";

// ─── Company Ad Form Defaults ────────────────────────────────

const emptyCompanyAdForm = {
  title: "",
  bannerUrl: "",
  destinationUrl: "",
  startsAt: new Date().toISOString().slice(0, 10),
  endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  isActive: true,
};

// ─── Component ───────────────────────────────────────────────

export default function AdminAdsPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("requests");
  const [adRequests, setAdRequests] = useState<AdRequest[]>([]);
  const [companyAds, setCompanyAds] = useState<CompanyAd[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [editingCompanyAd, setEditingCompanyAd] = useState<string | null>(null);
  const [companyForm, setCompanyForm] = useState(emptyCompanyAdForm);
  const [companySaving, setCompanySaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingData(true);
      if (activeTab === "requests") {
        const res = await fetch(`/api/admin/ads?tab=requests&status=${statusFilter}`);
        const result = await res.json();
        if (result.success) setAdRequests(result.data);
        else toast.error("Failed to load ad requests");
      } else {
        const res = await fetch("/api/admin/ads?tab=company");
        const result = await res.json();
        if (result.success) setCompanyAds(result.data);
        else toast.error("Failed to load company ads");
      }
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoadingData(false);
    }
  }, [user, activeTab, statusFilter]);

  useEffect(() => {
    if (!loading && (!user || role !== "admin")) {
      router.push("/auth");
    }
  }, [user, role, loading, router]);

  useEffect(() => {
    if (user && role === "admin") {
      fetchData();
    }
  }, [user, role, fetchData]);

  // ─── Ad Request Actions ────────────────────────────────────

  const handleAdAction = async (adRequestId: string, action: "approve" | "reject") => {
    if (action === "reject" && !rejectReason.trim()) {
      setShowRejectModal(adRequestId);
      return;
    }
    
    setActionLoading(adRequestId);
    try {
      const res = await fetch("/api/admin/ads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adRequestId, action, adminUserId: user?.id, reason: rejectReason.trim() || undefined }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(action === "approve" ? "Ad request approved" : "Ad request rejected");
        setShowRejectModal(null);
        setRejectReason("");
        fetchData();
      } else {
        toast.error(result.error || "Action failed");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Company Ad CRUD ───────────────────────────────────────

  const openCreateModal = () => {
    setEditingCompanyAd(null);
    setCompanyForm(emptyCompanyAdForm);
    setShowCompanyModal(true);
  };

  const openEditModal = (ad: CompanyAd) => {
    setEditingCompanyAd(ad.id);
    setCompanyForm({
      title: ad.title,
      bannerUrl: ad.banner_url || "",
      destinationUrl: ad.destination_url,
      startsAt: ad.starts_at.slice(0, 10),
      endsAt: ad.ends_at.slice(0, 10),
      isActive: ad.is_active,
    });
    setShowCompanyModal(true);
  };

  const handleCompanySave = async () => {
    if (!companyForm.title.trim() || !companyForm.destinationUrl.trim()) {
      toast.error("Title and destination URL are required");
      return;
    }

    setCompanySaving(true);
    try {
      if (editingCompanyAd) {
        // Update existing
        const res = await fetch("/api/admin/ads?tab=company", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            adId: editingCompanyAd,
            adminUserId: user?.id,
            title: companyForm.title.trim(),
            bannerUrl: companyForm.bannerUrl.trim() || null,
            destinationUrl: companyForm.destinationUrl.trim(),
            startsAt: new Date(companyForm.startsAt).toISOString(),
            endsAt: new Date(companyForm.endsAt).toISOString(),
            isActive: companyForm.isActive,
          }),
        });
        const result = await res.json();
        if (result.success) {
          toast.success("Company ad updated");
          setShowCompanyModal(false);
          fetchData();
        } else {
          toast.error(result.error || "Failed to update");
        }
      } else {
        // Create new
        const res = await fetch("/api/admin/ads?tab=company", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: companyForm.title.trim(),
            bannerUrl: companyForm.bannerUrl.trim() || null,
            destinationUrl: companyForm.destinationUrl.trim(),
            createdBy: user?.id,
            startsAt: new Date(companyForm.startsAt).toISOString(),
            endsAt: new Date(companyForm.endsAt).toISOString(),
            isActive: companyForm.isActive,
          }),
        });
        const result = await res.json();
        if (result.success) {
          toast.success("Company ad created");
          setShowCompanyModal(false);
          fetchData();
        } else {
          toast.error(result.error || "Failed to create");
        }
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setCompanySaving(false);
    }
  };

  const handleCompanyDelete = async (adId: string) => {
    setActionLoading(adId);
    try {
      const res = await fetch(`/api/admin/ads?tab=company&adId=${adId}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Company ad deleted");
        setDeleteConfirm(null);
        fetchData();
      } else {
        toast.error(result.error || "Failed to delete");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Filters ───────────────────────────────────────────────

  const filteredAdRequests = adRequests.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.vendor_profiles?.business_name?.toLowerCase().includes(q) ||
      r.target_type.toLowerCase().includes(q)
    );
  });

  const filteredCompanyAds = companyAds.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.destination_url.toLowerCase().includes(q) ||
      a.creator?.full_name?.toLowerCase().includes(q)
    );
  });

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
                  Ad & Sponsorship
                </h1>
              </div>
              <p className="text-gray-500">Review ad requests and manage company advertisements</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className={`h-4 w-4 ${loadingData ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              {activeTab === "company" && (
                <Button variant="primary" size="sm" onClick={openCreateModal}>
                  <Plus className="h-4 w-4" />
                  New Company Ad
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={activeTab === "requests" ? "primary" : "outline"}
              size="sm"
              onClick={() => setActiveTab("requests")}
            >
              <Megaphone className="h-4 w-4" />
              Ad Requests
            </Button>
            <Button
              variant={activeTab === "company" ? "primary" : "outline"}
              size="sm"
              onClick={() => setActiveTab("company")}
            >
              <ImageIcon className="h-4 w-4" />
              Company Ads
            </Button>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={activeTab === "requests" ? "Search by vendor or type..." : "Search by title, URL, or creator..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-all"
            />
          </div>

          {/* ─── TAB: AD REQUESTS ─────────────────────────── */}
          {activeTab === "requests" && (
            <>
              {/* Status Filter */}
              <div className="flex flex-wrap gap-2 mb-6">
                {["pending", "approved", "rejected", "expired", "all"].map((s) => (
                  <Button
                    key={s}
                    variant={statusFilter === s ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter(s)}
                  >
                    {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                  </Button>
                ))}
              </div>

              {loadingData ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
                </div>
              ) : filteredAdRequests.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                  <Megaphone className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-brand-navy mb-1">No ad requests</h3>
                  <p className="text-gray-500">All ad requests have been processed.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAdRequests.map((req) => (
                    <div
                      key={req.id}
                      className={`glass rounded-2xl p-6 hover:shadow-md transition-shadow border-l-4 ${
                        req.status === "approved"
                          ? "border-l-accent-success"
                          : req.status === "rejected"
                            ? "border-l-accent-error"
                            : req.status === "expired"
                              ? "border-l-gray-400"
                              : "border-l-accent-warning"
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row gap-4">
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-brand-navy/5 flex items-center justify-center flex-shrink-0">
                              <Store className="h-5 w-5 text-brand-navy" />
                            </div>
                            <div>
                              <h3 className="font-bold text-brand-navy">
                                {req.vendor_profiles?.business_name || "Unknown Vendor"}
                              </h3>
                              <p className="text-xs text-gray-500">
                                {req.target_type === "account"
                                  ? "Account Promotion"
                                  : req.target_type === "listing"
                                    ? "Listing Promotion"
                                    : "Bundle Promotion"}
                                {" \u00b7 "}
                                {req.duration_days} days
                                {" \u00b7 "}
                                ₦{Number(req.price_paid).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          {req.target_ids.length > 0 && (
                            <p className="text-xs text-gray-400">
                              Targeting {req.target_ids.length} item(s)
                            </p>
                          )}
                          {req.ends_at && (
                            <p className="text-xs text-gray-400 mt-1">
                              <Calendar className="h-3 w-3 inline mr-1" />
                              {new Date(req.ends_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>

                        {/* Status & Actions */}
                        <div className="flex flex-row lg:flex-col items-center lg:items-end gap-2 lg:min-w-[140px]">
                          <span
                            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                              req.status === "approved"
                                ? "bg-accent-success/10 text-accent-success"
                                : req.status === "rejected"
                                  ? "bg-accent-error/10 text-accent-error"
                                  : req.status === "expired"
                                    ? "bg-gray-100 text-gray-500"
                                    : "bg-accent-warning/10 text-accent-warning"
                            }`}
                          >
                            {req.status === "approved" ? (
                              <CheckCircle className="h-3.5 w-3.5" />
                            ) : req.status === "rejected" ? (
                              <XCircle className="h-3.5 w-3.5" />
                            ) : req.status === "expired" ? (
                              <Clock className="h-3.5 w-3.5" />
                            ) : (
                              <Clock className="h-3.5 w-3.5" />
                            )}
                            {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                          </span>

                          {req.status === "pending" && (
                            <div className="flex gap-2 w-full">
                              <Button
                                variant="primary"
                                size="sm"
                                className="flex-1"
                                onClick={() => handleAdAction(req.id, "approve")}
                                disabled={actionLoading === req.id}
                              >
                                {actionLoading === req.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                                Approve
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                className="flex-1"
                                onClick={() => setShowRejectModal(req.id)}
                                disabled={actionLoading === req.id}
                              >
                                {actionLoading === req.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <XCircle className="h-4 w-4" />
                                )}
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ─── TAB: COMPANY ADS ─────────────────────────── */}
          {activeTab === "company" && (
            <>
              {loadingData ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
                </div>
              ) : filteredCompanyAds.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                  <ImageIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-brand-navy mb-1">No company ads</h3>
                  <p className="text-gray-500">Create your first company advertisement.</p>
                  <Button variant="primary" className="mt-4" onClick={openCreateModal}>
                    <Plus className="h-4 w-4" />
                    Create Company Ad
                  </Button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCompanyAds.map((ad) => (
                    <div key={ad.id} className="glass rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
                      {/* Banner Preview */}
                      <div className="h-32 bg-brand-navy/5 flex items-center justify-center overflow-hidden">
                        {ad.banner_url ? (
                          <img
                            src={ad.banner_url}
                            alt={ad.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-10 w-10 text-gray-300" />
                        )}
                      </div>

                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-brand-navy truncate flex-1">{ad.title}</h3>
                          {ad.is_active ? (
                            <span className="flex items-center gap-1 text-xs text-accent-success bg-accent-success/10 px-2 py-0.5 rounded-full ml-2">
                              <Eye className="h-3 w-3" />
                              Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full ml-2">
                              <EyeOff className="h-3 w-3" />
                              Inactive
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-gray-500 truncate mb-2">
                          <ExternalLink className="h-3 w-3 inline mr-1" />
                          {ad.destination_url}
                        </p>

                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                          <Calendar className="h-3 w-3" />
                          {new Date(ad.starts_at).toLocaleDateString()} - {new Date(ad.ends_at).toLocaleDateString()}
                        </div>

                        <p className="text-xs text-gray-400 mb-3">
                          Created by {ad.creator?.full_name || ad.creator?.email || "Unknown"}
                        </p>

                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditModal(ad)}>
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            className="flex-1"
                            onClick={() => setDeleteConfirm(ad.id)}
                            disabled={actionLoading === ad.id}
                          >
                            {actionLoading === ad.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                            Delete
                          </Button>
                        </div>

                        {/* Inline Delete Confirm */}
                        {deleteConfirm === ad.id && (
                          <div className="mt-3 p-3 bg-accent-error/5 rounded-xl border border-accent-error/20">
                            <p className="text-xs text-accent-error mb-2">Delete this ad permanently?</p>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeleteConfirm(null)}>
                                Cancel
                              </Button>
                              <Button variant="danger" size="sm" className="flex-1" onClick={() => handleCompanyDelete(ad.id)}>
                                Delete
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ─── COMPANY AD MODAL (Create/Edit) ────────────── */}
          {showCompanyModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-8">
              <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-xl">
                <h3 className="font-bold text-brand-navy text-lg mb-1">
                  {editingCompanyAd ? "Edit Company Ad" : "Create Company Ad"}
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  {editingCompanyAd
                    ? "Update the details of this advertisement."
                    : "Create a new company-wide advertisement banner."}
                </p>

                {/* Title */}
                <label className="block text-sm font-medium text-brand-navy mb-1.5">Title *</label>
                <input
                  type="text"
                  value={companyForm.title}
                  onChange={(e) => setCompanyForm({ ...companyForm, title: e.target.value })}
                  placeholder="e.g. Summer Sale 2026"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold mb-4"
                />

                {/* Banner URL */}
                <label className="block text-sm font-medium text-brand-navy mb-1.5">Banner Image URL</label>
                <input
                  type="url"
                  value={companyForm.bannerUrl}
                  onChange={(e) => setCompanyForm({ ...companyForm, bannerUrl: e.target.value })}
                  placeholder="https://example.com/banner.jpg"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold mb-4"
                />

                {/* Destination URL */}
                <label className="block text-sm font-medium text-brand-navy mb-1.5">Destination URL *</label>
                <input
                  type="url"
                  value={companyForm.destinationUrl}
                  onChange={(e) => setCompanyForm({ ...companyForm, destinationUrl: e.target.value })}
                  placeholder="https://example.com/landing"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold mb-4"
                />

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-brand-navy mb-1.5">Start Date</label>
                    <input
                      type="date"
                      value={companyForm.startsAt}
                      onChange={(e) => setCompanyForm({ ...companyForm, startsAt: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-navy mb-1.5">End Date</label>
                    <input
                      type="date"
                      value={companyForm.endsAt}
                      onChange={(e) => setCompanyForm({ ...companyForm, endsAt: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold"
                    />
                  </div>
                </div>

                {/* Active Toggle */}
                <label className="flex items-center gap-3 mb-6 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={companyForm.isActive}
                    onChange={(e) => setCompanyForm({ ...companyForm, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-brand-gold focus:ring-brand-gold"
                  />
                  <div>
                    <span className="text-sm font-medium text-brand-navy">Active</span>
                    <p className="text-xs text-gray-400">Ad will be displayed on the platform</p>
                  </div>
                </label>

                {/* Actions */}
                <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                  <Button variant="outline" onClick={() => setShowCompanyModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleCompanySave}
                    disabled={companySaving || !companyForm.title.trim() || !companyForm.destinationUrl.trim()}
                  >
                    {companySaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : editingCompanyAd ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {editingCompanyAd ? "Update" : "Create"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Rejection Reason Modal */}
          {showRejectModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
                <h3 className="font-bold text-brand-navy text-lg mb-2">Reject Ad Request</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Provide a reason for rejection. This helps the vendor understand why their ad request was not approved.
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
                    onClick={() => handleAdAction(showRejectModal, "reject")}
                    disabled={!rejectReason.trim()}
                  >
                    <XCircle className="h-4 w-4" />
                    Reject Request
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
