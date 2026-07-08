"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import StaggerEntrance from "@/components/animations/StaggerEntrance";
import { formatNaira, slugify } from "@/lib/utils";
import { toast } from "sonner";
import {
  Package,
  Plus,
  Eye,
  Edit3,
  Trash2,
  Search,
  X,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";

type ListingStatus = "pending_review" | "approved" | "rejected" | "flagged";

interface Listing {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  price: number | null;
  price_period: string | null;
  category_id: string | null;
  image_urls: string[];
  status: ListingStatus;
  status_reason: string | null;
  is_service: boolean;
  tags: string[];
  view_count: number;
  contact_click_count: number;
  created_at: string;
  updated_at: string;
}

const STATUS_CONFIG: Record<ListingStatus, { label: string; color: string; icon: any }> = {
  pending_review: {
    label: "Pending Review",
    color: "text-accent-warning bg-accent-warning/10 border-accent-warning/20",
    icon: Clock,
  },
  approved: {
    label: "Approved",
    color: "text-accent-success bg-accent-success/10 border-accent-success/20",
    icon: CheckCircle,
  },
  rejected: {
    label: "Rejected",
    color: "text-accent-error bg-accent-error/10 border-accent-error/20",
    icon: XCircle,
  },
  flagged: {
    label: "Flagged",
    color: "text-accent-error bg-accent-error/10 border-accent-error/20",
    icon: AlertTriangle,
  },
};

const defaultCategories = [
  { id: "1", name: "Fashion & Style" },
  { id: "2", name: "Food & Beverages" },
  { id: "3", name: "Tech & Electronics" },
  { id: "4", name: "Makeup & Beauty" },
  { id: "5", name: "Photography & Videography" },
  { id: "6", name: "Tailoring & Sewing" },
  { id: "7", name: "Hair Styling" },
  { id: "8", name: "Event Planning" },
  { id: "9", name: "Home & Auto Repair" },
  { id: "10", name: "Other" },
];

export default function VendorListingsPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ListingStatus | "all">("all");

  // Create/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formPricePeriod, setFormPricePeriod] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formIsService, setFormIsService] = useState(false);
  const [formTags, setFormTags] = useState("");

  // Confirm delete
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!authLoading && (!user || role !== "vendor")) {
      router.push("/auth?type=vendor");
    }
  }, [user, role, authLoading, router]);

  // Fetch listings
  const fetchListings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/vendor/listings?userId=${user.id}`);
      const result = await response.json();
      if (result.success) {
        setListings(result.data || []);
      } else {
        setError(result.error || "Failed to fetch listings");
      }
    } catch {
      setError("Failed to load listings");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchListings();
  }, [user, fetchListings]);

  const openCreateModal = () => {
    setEditingListing(null);
    setFormTitle("");
    setFormDescription("");
    setFormPrice("");
    setFormPricePeriod("");
    setFormCategory("");
    setFormIsService(false);
    setFormTags("");
    setShowModal(true);
  };

  const openEditModal = (listing: Listing) => {
    setEditingListing(listing);
    setFormTitle(listing.title);
    setFormDescription(listing.description || "");
    setFormPrice(listing.price?.toString() || "");
    setFormPricePeriod(listing.price_period || "");
    setFormCategory(listing.category_id || "");
    setFormIsService(listing.is_service);
    setFormTags(listing.tags.join(", "));
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formTitle.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const tags = formTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      if (editingListing) {
        // Update existing listing
        const response = await fetch("/api/vendor/listings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            listingId: editingListing.id,
            title: formTitle.trim(),
            description: formDescription.trim(),
            price: formPrice ? parseFloat(formPrice) : null,
            pricePeriod: formPricePeriod || null,
            categoryId: formCategory || null,
            isService: formIsService,
            tags,
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
      } else {
        // Create new listing
        const response = await fetch("/api/vendor/listings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            title: formTitle.trim(),
            description: formDescription.trim(),
            price: formPrice ? parseFloat(formPrice) : null,
            pricePeriod: formPricePeriod || null,
            categoryId: formCategory || null,
            isService: formIsService,
            tags,
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
      }

      setShowModal(false);
      toast.success(
        editingListing
          ? "Listing updated! It's been sent for re-review."
          : "Listing created! It's now pending review."
      );
      fetchListings();
    } catch (err: any) {
      setError(err.message || "Failed to save listing");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (listingId: string) => {
    if (!user) return;
    setSaving(true);
    try {
      const response = await fetch("/api/vendor/listings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, listingId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setDeleteConfirm(null);
      toast.success("Listing deleted successfully.");
      fetchListings();
    } catch (err: any) {
      setError(err.message || "Failed to delete listing");
    } finally {
      setSaving(false);
    }
  };

  // Filter and search
  const filteredListings = listings.filter((l) => {
    const matchesSearch =
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: listings.length,
    pending_review: listings.filter((l) => l.status === "pending_review").length,
    approved: listings.filter((l) => l.status === "approved").length,
    rejected: listings.filter((l) => l.status === "rejected").length,
    flagged: listings.filter((l) => l.status === "flagged").length,
  };

  if (authLoading) {
    return (
      <>
        <Header />
        <div className="pt-20 min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
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
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard/vendor"
                  className="text-gray-400 hover:text-brand-navy"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy font-display">
                  Manage Listings
                </h1>
              </div>
              <p className="text-gray-500 mt-1">
                Add, edit, and manage your products and services
              </p>
            </div>
            <Button variant="gold" size="md" onClick={openCreateModal}>
              <Plus className="h-4 w-4" />
              Add Listing
            </Button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-accent-error/5 border border-accent-error/20 text-accent-error text-sm">
              {error}
            </div>
          )}

          {/* Filters */}
          <div className="glass rounded-2xl p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search listings..."
                  className="w-full h-10 pl-9 pr-4 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent text-sm"
                />
              </div>

              {/* Status filter pills */}
              <div className="flex flex-wrap gap-2">
                {(["all", "pending_review", "approved", "rejected", "flagged"] as const).map(
                  (status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        statusFilter === status
                          ? "bg-brand-navy text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {status === "all"
                        ? `All (${statusCounts.all})`
                        : `${STATUS_CONFIG[status].label} (${statusCounts[status]})`}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Listings Table */}
          {loading ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand-gold mx-auto mb-4" />
              <p className="text-gray-500">Loading your listings...</p>
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-bold text-brand-navy mb-2">
                {searchQuery || statusFilter !== "all"
                  ? "No matching listings"
                  : "No listings yet"}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search or filters."
                  : "Add your first product or service to start getting discovered."}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Button variant="gold" onClick={openCreateModal}>
                  <Plus className="h-4 w-4" />
                  Add Your First Listing
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredListings.map((listing) => {
                const statusConfig = STATUS_CONFIG[listing.status];
                const StatusIcon = statusConfig.icon;

                return (
                  <div
                    key={listing.id}
                    className="glass rounded-2xl p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      {/* Image placeholder */}
                      <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                        {listing.image_urls?.[0] ? (
                          <img
                            src={listing.image_urls[0]}
                            alt={listing.title}
                            className="w-full h-full object-cover rounded-xl"
                          />
                        ) : (
                          <ImageIcon className="h-6 w-6 text-gray-300" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-bold text-brand-navy">
                              {listing.title}
                            </h3>
                            <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">
                              {listing.description || "No description"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}
                            >
                              <StatusIcon className="h-3 w-3" />
                              {statusConfig.label}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
                          {listing.price !== null && (
                            <span className="font-semibold text-brand-gold">
                              {formatNaira(listing.price)}
                              {listing.price_period &&
                                `/${listing.price_period}`}
                            </span>
                          )}
                          <span className="text-gray-400">
                            {listing.is_service ? "Service" : "Product"}
                          </span>
                          <span className="text-gray-400">
                            {listing.view_count} views
                          </span>
                          {listing.status === "rejected" &&
                            listing.status_reason && (
                              <span className="text-accent-error text-xs">
                                Reason: {listing.status_reason}
                              </span>
                            )}
                        </div>

                        {listing.tags && listing.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {listing.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 rounded-md bg-gray-100 text-xs text-gray-500"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => openEditModal(listing)}
                          className="p-2 rounded-lg text-gray-400 hover:text-brand-navy hover:bg-gray-100 transition-all"
                          title="Edit listing"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        {deleteConfirm === listing.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(listing.id)}
                              className="px-2 py-1.5 rounded-lg bg-accent-error text-white text-xs font-semibold hover:bg-red-600"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-2 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-gray-200"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(listing.id)}
                            className="p-2 rounded-lg text-gray-400 hover:text-accent-error hover:bg-red-50 transition-all"
                            title="Delete listing"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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
      </main>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-brand-navy font-display">
                  {editingListing ? "Edit Listing" : "Add New Listing"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. iPhone 15 Pro Max"
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Describe your product or service..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {formDescription.length}/500 characters
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price (NGN)
                    </label>
                    <input
                      type="number"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      placeholder="e.g. 50000"
                      min={0}
                      className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price Period
                    </label>
                    <select
                      value={formPricePeriod}
                      onChange={(e) => setFormPricePeriod(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                    >
                      <option value="">One time</option>
                      <option value="hour">Per hour</option>
                      <option value="day">Per day</option>
                      <option value="week">Per week</option>
                      <option value="month">Per month</option>
                      <option value="year">Per year</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                  >
                    <option value="">Select a category</option>
                    {defaultCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsService}
                      onChange={(e) => setFormIsService(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-gold rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-gold" />
                  </label>
                  <span className="text-sm text-gray-700">
                    This is a service (not a physical product)
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="e.g. electronics, smartphone, apple"
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Helps buyers find your listing in search
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="flex-1"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="gold"
                    size="lg"
                    className="flex-1"
                    loading={saving}
                  >
                    {editingListing ? "Save Changes" : "Add Listing"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
