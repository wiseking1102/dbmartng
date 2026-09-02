"use client";

import {
  useState,
  useEffect,
  useCallback,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import StaggerEntrance from "@/components/animations/StaggerEntrance";
import { createClient } from "@/lib/supabase/client";
import { formatNaira } from "@/lib/utils";
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
  Image as ImageIcon,
  Loader2,
  Tag,
  Wrench,
} from "lucide-react";

type ListingStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "flagged";

type CategoryType = "goods" | "service";

interface Category {
  id: string;
  name: string;
  slug: string;
  type: CategoryType;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

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

const STATUS_CONFIG: Record<
  ListingStatus,
  {
    label: string;
    color: string;
    icon: typeof Clock;
  }
> = {
  pending_review: {
    label: "Pending Review",
    color:
      "text-accent-warning bg-accent-warning/10 border-accent-warning/20",
    icon: Clock,
  },
  approved: {
    label: "Approved",
    color:
      "text-accent-success bg-accent-success/10 border-accent-success/20",
    icon: CheckCircle,
  },
  rejected: {
    label: "Rejected",
    color:
      "text-accent-error bg-accent-error/10 border-accent-error/20",
    icon: XCircle,
  },
  flagged: {
    label: "Flagged",
    color:
      "text-accent-error bg-accent-error/10 border-accent-error/20",
    icon: AlertTriangle,
  },
};

export default function VendorListingsPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] =
    useState(true);

  const [error, setError] = useState<string | null>(
    null
  );

  const [searchQuery, setSearchQuery] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<ListingStatus | "all">("all");

  const [typeFilter, setTypeFilter] =
    useState<"all" | "goods" | "service">("all");

  const [showModal, setShowModal] =
    useState(false);

  const [editingListing, setEditingListing] =
    useState<Listing | null>(null);

  const [saving, setSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] =
    useState<string | null>(null);

  const [formTitle, setFormTitle] =
    useState("");

  const [formDescription, setFormDescription] =
    useState("");

  const [formPrice, setFormPrice] =
    useState("");

  const [formPricePeriod, setFormPricePeriod] =
    useState("");

  const [formCategory, setFormCategory] =
    useState("");

  const [formIsService, setFormIsService] =
    useState(false);

  const [formTags, setFormTags] =
    useState("");

  /*
   * Vendor-only guard.
   */
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/auth?type=vendor");
      return;
    }

    if (role !== "vendor") {
      if (
        role === "admin" ||
        role === "sub_admin"
      ) {
        router.replace("/dashboard/admin");
      } else if (role === "buyer") {
        router.replace("/dashboard/buyer");
      } else {
        router.replace("/account");
      }
    }
  }, [
    user,
    role,
    authLoading,
    router,
  ]);

  /*
   * Get the current Supabase access token.
   * The API now authenticates the vendor from
   * this token rather than trusting a userId
   * supplied by the browser.
   */
  const getAccessToken =
    useCallback(async () => {
      const {
        data,
        error,
      } = await supabase.auth.getSession();

      if (
        error ||
        !data.session?.access_token
      ) {
        return null;
      }

      return data.session.access_token;
    }, [supabase]);

  /*
   * Load real marketplace categories from Supabase.
   */
  const fetchCategories =
    useCallback(async () => {
      setCategoriesLoading(true);

      try {
        const {
          data,
          error: categoryError,
        } = await supabase
          .from("categories")
          .select(
            "id, name, slug, type, description, sort_order, is_active"
          )
          .eq("is_active", true)
          .order("sort_order", {
            ascending: true,
          })
          .order("name", {
            ascending: true,
          });

        if (categoryError) {
          console.error(
            "Category fetch error:",
            categoryError
          );

          setError(
            "Unable to load marketplace categories."
          );

          return;
        }

        const normalized =
          ((data || []) as Category[]).filter(
            (category) =>
              category.type === "goods" ||
              category.type === "service"
          );

        setCategories(normalized);
      } catch (err) {
        console.error(
          "Category loading error:",
          err
        );

        setError(
          "Unable to load marketplace categories."
        );
      } finally {
        setCategoriesLoading(false);
      }
    }, [supabase]);

  /*
   * Load vendor listings.
   */
  const fetchListings =
    useCallback(async () => {
      if (!user) return;

      setLoading(true);
      setError(null);

      try {
        const token =
          await getAccessToken();

        if (!token) {
          setError(
            "Your session has expired. Please sign in again."
          );

          router.replace(
            "/auth?type=vendor"
          );

          return;
        }

        const response =
          await fetch(
            "/api/vendor/listings",
            {
              method: "GET",
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
              cache: "no-store",
            }
          );

        const result =
          await response.json();

        if (
          response.status === 401
        ) {
          router.replace(
            "/auth?type=vendor"
          );
          return;
        }

        if (!response.ok) {
          throw new Error(
            result.error ||
              "Failed to fetch listings"
          );
        }

        if (result.success) {
          setListings(
            (result.data ||
              []) as Listing[]
          );
        } else {
          throw new Error(
            result.error ||
              "Failed to fetch listings"
          );
        }
      } catch (err) {
        console.error(
          "Listings fetch error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load listings"
        );
      } finally {
        setLoading(false);
      }
    }, [
      user,
      getAccessToken,
      router,
    ]);

  useEffect(() => {
    if (
      authLoading ||
      !user ||
      role !== "vendor"
    ) {
      return;
    }

    fetchListings();
    fetchCategories();
  }, [
    authLoading,
    user,
    role,
    fetchListings,
    fetchCategories,
  ]);

  const resetForm = () => {
    setEditingListing(null);
    setFormTitle("");
    setFormDescription("");
    setFormPrice("");
    setFormPricePeriod("");
    setFormCategory("");
    setFormIsService(false);
    setFormTags("");
  };

  const openCreateModal = () => {
    resetForm();
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (
    listing: Listing
  ) => {
    setEditingListing(listing);
    setFormTitle(listing.title);
    setFormDescription(
      listing.description || ""
    );
    setFormPrice(
      listing.price !== null
        ? String(listing.price)
        : ""
    );
    setFormPricePeriod(
      listing.price_period || ""
    );
    setFormCategory(
      listing.category_id || ""
    );
    setFormIsService(
      listing.is_service
    );
    setFormTags(
      (listing.tags || []).join(", ")
    );
    setError(null);
    setShowModal(true);
  };

  /*
   * Change the category list automatically
   * when switching between products and services.
   */
  const handleTypeChange = (
    isService: boolean
  ) => {
    setFormIsService(isService);

    const currentCategory =
      categories.find(
        (category) =>
          category.id ===
          formCategory
      );

    if (
      currentCategory &&
      ((isService &&
        currentCategory.type !==
          "service") ||
        (!isService &&
          currentCategory.type !==
            "goods"))
    ) {
      setFormCategory("");
    }
  };

  const handleSave = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!user) {
      setError(
        "You must be signed in as a vendor."
      );
      return;
    }

    const title =
      formTitle.trim();

    if (!title) {
      setError(
        "Listing title is required."
      );
      return;
    }

    if (
      formDescription.trim()
        .length < 10
    ) {
      setError(
        "Please provide a more detailed description."
      );
      return;
    }

    if (
      formPrice &&
      (
        !Number.isFinite(
          Number(formPrice)
        ) ||
        Number(formPrice) < 0
      )
    ) {
      setError(
        "Please enter a valid price."
      );
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token =
        await getAccessToken();

      if (!token) {
        router.replace(
          "/auth?type=vendor"
        );
        return;
      }

      const tags =
        formTags
          .split(",")
          .map((tag) =>
            tag.trim()
          )
          .filter(Boolean)
          .slice(0, 20);

      const payload = {
        listingId:
          editingListing?.id,
        title,
        description:
          formDescription.trim(),
        price: formPrice
          ? Number(formPrice)
          : null,
        pricePeriod:
          formPricePeriod.trim() ||
          null,
        categoryId:
          formCategory || null,
        isService:
          formIsService,
        tags,
      };

      const response =
        await fetch(
          "/api/vendor/listings",
          {
            method:
              editingListing
                ? "PUT"
                : "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${token}`,
            },
            body:
              JSON.stringify(
                payload
              ),
          }
        );

      const result =
        await response.json();

      if (
        response.status === 401
      ) {
        router.replace(
          "/auth?type=vendor"
        );
        return;
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Failed to save listing"
        );
      }

      setShowModal(false);
      resetForm();

      toast.success(
        editingListing
          ? "Listing updated and sent for re-review."
          : "Listing created and submitted for review."
      );

      await fetchListings();
    } catch (err) {
      console.error(
        "Save listing error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to save listing"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (
    listingId: string
  ) => {
    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      const token =
        await getAccessToken();

      if (!token) {
        router.replace(
          "/auth?type=vendor"
        );
        return;
      }

      const response =
        await fetch(
          "/api/vendor/listings",
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${token}`,
            },
            body:
              JSON.stringify({
                listingId,
              }),
          }
        );

      const result =
        await response.json();

      if (
        response.status === 401
      ) {
        router.replace(
          "/auth?type=vendor"
        );
        return;
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Failed to delete listing"
        );
      }

      setDeleteConfirm(null);

      toast.success(
        "Listing deleted successfully."
      );

      await fetchListings();
    } catch (err) {
      console.error(
        "Delete listing error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete listing"
      );
    } finally {
      setSaving(false);
    }
  };

  const filteredListings =
    listings.filter((listing) => {
      const query =
        searchQuery
          .trim()
          .toLowerCase();

      const matchesSearch =
        !query ||
        listing.title
          .toLowerCase()
          .includes(query) ||
        (
          listing.description ||
          ""
        )
          .toLowerCase()
          .includes(query) ||
        (
          listing.tags || []
        ).some((tag) =>
          tag
            .toLowerCase()
            .includes(query)
        );

      const matchesStatus =
        statusFilter === "all" ||
        listing.status ===
          statusFilter;

      const matchesType =
        typeFilter === "all" ||
        (
          typeFilter ===
          "service"
            ? listing.is_service
            : !listing.is_service
        );

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType
      );
    });

  const statusCounts = {
    all: listings.length,
    pending_review:
      listings.filter(
        (listing) =>
          listing.status ===
          "pending_review"
      ).length,
    approved:
      listings.filter(
        (listing) =>
          listing.status ===
          "approved"
      ).length,
    rejected:
      listings.filter(
        (listing) =>
          listing.status ===
          "rejected"
      ).length,
    flagged:
      listings.filter(
        (listing) =>
          listing.status ===
          "flagged"
      ).length,
  };

  const goodsCategories =
    categories.filter(
      (category) =>
        category.type ===
        "goods"
    );

  const serviceCategories =
    categories.filter(
      (category) =>
        category.type ===
        "service"
    );

  const availableCategories =
    formIsService
      ? serviceCategories
      : goodsCategories;

  const getCategoryName = (
    categoryId: string | null
  ) => {
    if (!categoryId) {
      return null;
    }

    return (
      categories.find(
        (category) =>
          category.id ===
          categoryId
      )?.name || null
    );
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

  if (
    !user ||
    role !== "vendor"
  ) {
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
                    className="text-gray-400 hover:text-brand-navy transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Link>

                  <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy font-display">
                    Manage Listings
                  </h1>
                </div>

                <p className="text-gray-500 mt-1">
                  Add, edit, and manage
                  your products and
                  services
                </p>
              </div>

              <Button
                variant="gold"
                size="md"
                onClick={
                  openCreateModal
                }
              >
                <Plus className="h-4 w-4" />
                Add Listing
              </Button>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-accent-error/5 border border-accent-error/20 text-accent-error text-sm flex items-start justify-between gap-4">
                <span>{error}</span>

                <button
                  type="button"
                  onClick={() =>
                    setError(null)
                  }
                  className="shrink-0"
                  aria-label="Dismiss error"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Filters */}
            <div className="glass rounded-2xl p-4 mb-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Search */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />

                    <input
                      type="text"
                      value={
                        searchQuery
                      }
                      onChange={(event) =>
                        setSearchQuery(
                          event.target.value
                        )
                      }
                      placeholder="Search listings..."
                      className="w-full h-10 pl-9 pr-4 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent text-sm"
                    />
                  </div>

                  {/* Type filters */}
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        [
                          "all",
                          "All Types",
                        ],
                        [
                          "goods",
                          "Products",
                        ],
                        [
                          "service",
                          "Services",
                        ],
                      ] as const
                    ).map(
                      ([
                        type,
                        label,
                      ]) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() =>
                            setTypeFilter(
                              type
                            )
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            typeFilter ===
                            type
                              ? "bg-brand-navy text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {label}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Status filters */}
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      "all",
                      "pending_review",
                      "approved",
                      "rejected",
                      "flagged",
                    ] as const
                  ).map(
                    (status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() =>
                          setStatusFilter(
                            status
                          )
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          statusFilter ===
                          status
                            ? "bg-brand-navy text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {status ===
                        "all"
                          ? `All (${statusCounts.all})`
                          : `${STATUS_CONFIG[status].label} (${statusCounts[status]})`}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Listings */}
            {loading ? (
              <div className="glass rounded-2xl p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand-gold mx-auto mb-4" />

                <p className="text-gray-500">
                  Loading your
                  listings...
                </p>
              </div>
            ) : filteredListings.length ===
              0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />

                <h3 className="text-lg font-bold text-brand-navy mb-2">
                  {searchQuery ||
                  statusFilter !==
                    "all" ||
                  typeFilter !==
                    "all"
                    ? "No matching listings"
                    : "No listings yet"}
                </h3>

                <p className="text-gray-500 mb-6">
                  {searchQuery ||
                  statusFilter !==
                    "all" ||
                  typeFilter !==
                    "all"
                    ? "Try adjusting your search or filters."
                    : "Add your first product or service to start getting discovered."}
                </p>

                {!searchQuery &&
                  statusFilter ===
                    "all" &&
                  typeFilter ===
                    "all" && (
                    <Button
                      variant="gold"
                      onClick={
                        openCreateModal
                      }
                    >
                      <Plus className="h-4 w-4" />
                      Add Your First
                      Listing
                    </Button>
                  )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredListings.map(
                  (listing) => {
                    const statusConfig =
                      STATUS_CONFIG[
                        listing.status
                      ];

                    const StatusIcon =
                      statusConfig.icon;

                    const categoryName =
                      getCategoryName(
                        listing.category_id
                      );

                    return (
                      <div
                        key={
                          listing.id
                        }
                        className="glass rounded-2xl p-5 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start gap-4">
                          {/* Image */}
                          <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                            {listing
                              .image_urls
                              ?.[
                              0
                            ] ? (
                              <img
                                src={
                                  listing
                                    .image_urls[
                                    0
                                  ]
                                }
                                alt={
                                  listing.title
                                }
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="h-6 w-6 text-gray-300" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="font-bold text-brand-navy truncate">
                                  {
                                    listing.title
                                  }
                                </h3>

                                <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">
                                  {listing.description ||
                                    "No description"}
                                </p>
                              </div>

                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border shrink-0 ${statusConfig.color}`}
                              >
                                <StatusIcon className="h-3 w-3" />

                                {
                                  statusConfig.label
                                }
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-xs text-gray-500">
                              {categoryName && (
                                <span className="inline-flex items-center gap-1">
                                  <Tag className="h-3.5 w-3.5" />

                                  {
                                    categoryName
                                  }
                                </span>
                              )}

                              <span className="inline-flex items-center gap-1">
                                {listing.is_service ? (
                                  <>
                                    <Wrench className="h-3.5 w-3.5" />
                                    Service
                                  </>
                                ) : (
                                  <>
                                    <Package className="h-3.5 w-3.5" />
                                    Product
                                  </>
                                )}
                              </span>

                              {listing.price !==
                                null && (
                                <span className="font-semibold text-brand-navy">
                                  {formatNaira(
                                    Number(
                                      listing.price
                                    )
                                  )}

                                  {listing.price_period
                                    ? ` / ${listing.price_period}`
                                    : ""}
                                </span>
                              )}

                              <span className="inline-flex items-center gap-1">
                                <Eye className="h-3.5 w-3.5" />
                                {listing.view_count ||
                                  0}{" "}
                                views
                              </span>

                              <span>
                                {
                                  listing.contact_click_count ||
                                    0
                                }{" "}
                                contacts
                              </span>
                            </div>

                            {/* Status reason */}
                            {listing.status_reason && (
                              <div className="mt-3 p-3 rounded-lg bg-gray-50 border border-gray-100 text-xs text-gray-600">
                                <span className="font-semibold text-brand-navy">
                                  Review
                                  note:
                                </span>{" "}
                                {
                                  listing.status_reason
                                }
                              </div>
                            )}

                            {/* Tags */}
                            {listing.tags?.length >
                              0 && (
                              <div className="flex flex-wrap gap-1.5 mt-3">
                                {listing.tags
                                  .slice(
                                    0,
                                    6
                                  )
                                  .map(
                                    (
                                      tag
                                    ) => (
                                      <span
                                        key={
                                          tag
                                        }
                                        className="px-2 py-1 rounded-md bg-gray-100 text-gray-500 text-[11px]"
                                      >
                                        #
                                        {
                                          tag
                                        }
                                      </span>
                                    )
                                  )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
                          {listing.status ===
                            "approved" && (
                            <Link
                              href={`/marketplace/${listing.slug}`}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Link>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              openEditModal(
                                listing
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-brand-navy hover:bg-brand-navy/5 transition-colors"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setDeleteConfirm(
                                listing.id
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-accent-error hover:bg-accent-error/5 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </StaggerEntrance>
        </div>
      </main>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close modal"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-default"
            onClick={() =>
              !saving &&
              setShowModal(false)
            }
          />

          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
            <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-brand-navy">
                  {editingListing
                    ? "Edit Listing"
                    : "Create Listing"}
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  {editingListing
                    ? "Changes will be reviewed before the listing is published again."
                    : "Add a product or service to DBMartNG."}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  !saving &&
                  setShowModal(false)
                }
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={
                handleSave
              }
              className="p-6 space-y-5"
            >
              {/* Modal error */}
              {error && (
                <div className="p-3 rounded-xl bg-accent-error/5 border border-accent-error/20 text-accent-error text-sm">
                  {error}
                </div>
              )}

              {/* Type */}
              <div>
                <label className="block text-sm font-semibold text-brand-navy mb-2">
                  What are you
                  listing?
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      handleTypeChange(
                        false
                      )
                    }
                    className={`p-4 rounded-xl border text-left transition-all ${
                      !formIsService
                        ? "border-brand-gold bg-brand-gold/5 ring-1 ring-brand-gold"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Package className="h-5 w-5 text-brand-navy mb-2" />

                    <div className="font-semibold text-brand-navy">
                      Product
                    </div>

                    <div className="text-xs text-gray-500 mt-1">
                      Physical goods
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleTypeChange(
                        true
                      )
                    }
                    className={`p-4 rounded-xl border text-left transition-all ${
                      formIsService
                        ? "border-brand-gold bg-brand-gold/5 ring-1 ring-brand-gold"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Wrench className="h-5 w-5 text-brand-navy mb-2" />

                    <div className="font-semibold text-brand-navy">
                      Service
                    </div>

                    <div className="text-xs text-gray-500 mt-1">
                      Skills and professional
                      services
                    </div>
                  </button>
                </div>
              </div>

              {/* Title */}
              <div>
                <label
                  htmlFor="listing-title"
                  className="block text-sm font-semibold text-brand-navy mb-2"
                >
                  Title
                </label>

                <input
                  id="listing-title"
                  type="text"
                  value={
                    formTitle
                  }
                  onChange={(event) =>
                    setFormTitle(
                      event.target.value
                    )
                  }
                  maxLength={150}
                  placeholder={
                    formIsService
                      ? "e.g. Professional Makeup Services"
                      : "e.g. Premium Sneakers"
                  }
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent text-sm"
                  required
                />

                <p className="text-[11px] text-gray-400 mt-1">
                  {formTitle.length}/150
                </p>
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="listing-description"
                  className="block text-sm font-semibold text-brand-navy mb-2"
                >
                  Description
                </label>

                <textarea
                  id="listing-description"
                  value={
                    formDescription
                  }
                  onChange={(event) =>
                    setFormDescription(
                      event.target.value
                    )
                  }
                  maxLength={5000}
                  rows={5}
                  placeholder="Describe what you're offering, important details, quality, location, delivery options, or anything buyers should know."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent text-sm resize-none"
                  required
                />

                <p className="text-[11px] text-gray-400 mt-1">
                  {formDescription.length}
                  /5000
                </p>
              </div>

              {/* Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="listing-price"
                    className="block text-sm font-semibold text-brand-navy mb-2"
                  >
                    Price
                  </label>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                      ₦
                    </span>

                    <input
                      id="listing-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        formPrice
                      }
                      onChange={(
                        event
                      ) =>
                        setFormPrice(
                          event.target
                            .value
                        )
                      }
                      placeholder="0.00"
                      className="w-full h-11 pl-8 pr-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent text-sm"
                    />
                  </div>

                  <p className="text-[11px] text-gray-400 mt-1">
                    Leave blank if the
                    price is negotiable.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="listing-price-period"
                    className="block text-sm font-semibold text-brand-navy mb-2"
                  >
                    Price period
                  </label>

                  <select
                    id="listing-price-period"
                    value={
                      formPricePeriod
                    }
                    onChange={(
                      event
                    ) =>
                      setFormPricePeriod(
                        event.target
                          .value
                      )
                    }
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent text-sm"
                  >
                    <option value="">
                      One-time / not specified
                    </option>
                    <option value="hour">
                      Per hour
                    </option>
                    <option value="day">
                      Per day
                    </option>
                    <option value="week">
                      Per week
                    </option>
                    <option value="month">
                      Per month
                    </option>
                    <option value="session">
                      Per session
                    </option>
                    <option value="item">
                      Per item
                    </option>
                  </select>
                </div>
              </div>

              {/* Category */}
              <div>
                <label
                  htmlFor="listing-category"
                  className="block text-sm font-semibold text-brand-navy mb-2"
                >
                  Category
                </label>

                <select
                  id="listing-category"
                  value={
                    formCategory
                  }
                  onChange={(event) =>
                    setFormCategory(
                      event.target
                        .value
                    )
                  }
                  disabled={
                    categoriesLoading
                  }
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent text-sm disabled:opacity-60"
                >
                  <option value="">
                    {categoriesLoading
                      ? "Loading categories..."
                      : "Select a category"}
                  </option>

                  {availableCategories.map(
                    (category) => (
                      <option
                        key={
                          category.id
                        }
                        value={
                          category.id
                        }
                      >
                        {category.name}
                      </option>
                    )
                  )}
                </select>

                {!categoriesLoading &&
                  availableCategories.length ===
                    0 && (
                    <p className="text-xs text-accent-error mt-1">
                      No active{" "}
                      {formIsService
                        ? "service"
                        : "product"}{" "}
                      categories are
                      available.
                    </p>
                  )}
              </div>

              {/* Tags */}
              <div>
                <label
                  htmlFor="listing-tags"
                  className="block text-sm font-semibold text-brand-navy mb-2"
                >
                  Tags
                </label>

                <input
                  id="listing-tags"
                  type="text"
                  value={
                    formTags
                  }
                  onChange={(event) =>
                    setFormTags(
                      event.target
                        .value
                    )
                  }
                  placeholder="e.g. sneakers, fashion, men"
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent text-sm"
                />

                <p className="text-[11px] text-gray-400 mt-1">
                  Separate tags with
                  commas.
                </p>
              </div>

              {/* Moderation notice */}
              <div className="p-4 rounded-xl bg-brand-navy/5 border border-brand-navy/10">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-brand-gold shrink-0 mt-0.5" />

                  <div>
                    <p className="text-sm font-semibold text-brand-navy">
                      Marketplace review
                    </p>

                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      New listings and
                      edited listings are
                      reviewed before they
                      appear publicly. Keep
                      your description
                      accurate and avoid
                      prohibited or
                      misleading content.
                    </p>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setShowModal(false)
                  }
                  disabled={saving}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  variant="gold"
                  disabled={
                    saving ||
                    categoriesLoading
                  }
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      {editingListing
                        ? "Save Changes"
                        : "Create Listing"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close confirmation"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-default"
            onClick={() =>
              !saving &&
              setDeleteConfirm(
                null
              )
            }
          />

          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <div className="w-12 h-12 rounded-full bg-accent-error/10 flex items-center justify-center mb-4">
              <Trash2 className="h-6 w-6 text-accent-error" />
            </div>

            <h2 className="text-xl font-bold text-brand-navy">
              Delete listing?
            </h2>

            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              This action cannot be
              undone. The listing and
              its marketplace record
              will be permanently
              removed.
            </p>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setDeleteConfirm(
                    null
                  )
                }
                disabled={saving}
              >
                Cancel
              </Button>

              <button
                type="button"
                onClick={() =>
                  handleDelete(
                    deleteConfirm
                  )
                }
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-accent-error text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete Listing
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}"use client";

import {
  useState,
  useEffect,
  useCallback,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import StaggerEntrance from "@/components/animations/StaggerEntrance";
import { createClient } from "@/lib/supabase/client";
import { formatNaira } from "@/lib/utils";
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
  Image as ImageIcon,
  Loader2,
  Tag,
  Wrench,
} from "lucide-react";

type ListingStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "flagged";

type CategoryType = "goods" | "service";

interface Category {
  id: string;
  name: string;
  slug: string;
  type: CategoryType;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

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

const STATUS_CONFIG: Record<
  ListingStatus,
  {
    label: string;
    color: string;
    icon: typeof Clock;
  }
> = {
  pending_review: {
    label: "Pending Review",
    color:
      "text-accent-warning bg-accent-warning/10 border-accent-warning/20",
    icon: Clock,
  },
  approved: {
    label: "Approved",
    color:
      "text-accent-success bg-accent-success/10 border-accent-success/20",
    icon: CheckCircle,
  },
  rejected: {
    label: "Rejected",
    color:
      "text-accent-error bg-accent-error/10 border-accent-error/20",
    icon: XCircle,
  },
  flagged: {
    label: "Flagged",
    color:
      "text-accent-error bg-accent-error/10 border-accent-error/20",
    icon: AlertTriangle,
  },
};

export default function VendorListingsPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] =
    useState(true);

  const [error, setError] = useState<string | null>(
    null
  );

  const [searchQuery, setSearchQuery] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<ListingStatus | "all">("all");

  const [typeFilter, setTypeFilter] =
    useState<"all" | "goods" | "service">("all");

  const [showModal, setShowModal] =
    useState(false);

  const [editingListing, setEditingListing] =
    useState<Listing | null>(null);

  const [saving, setSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] =
    useState<string | null>(null);

  const [formTitle, setFormTitle] =
    useState("");

  const [formDescription, setFormDescription] =
    useState("");

  const [formPrice, setFormPrice] =
    useState("");

  const [formPricePeriod, setFormPricePeriod] =
    useState("");

  const [formCategory, setFormCategory] =
    useState("");

  const [formIsService, setFormIsService] =
    useState(false);

  const [formTags, setFormTags] =
    useState("");

  /*
   * Vendor-only guard.
   */
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/auth?type=vendor");
      return;
    }

    if (role !== "vendor") {
      if (
        role === "admin" ||
        role === "sub_admin"
      ) {
        router.replace("/dashboard/admin");
      } else if (role === "buyer") {
        router.replace("/dashboard/buyer");
      } else {
        router.replace("/account");
      }
    }
  }, [
    user,
    role,
    authLoading,
    router,
  ]);

  /*
   * Get the current Supabase access token.
   * The API now authenticates the vendor from
   * this token rather than trusting a userId
   * supplied by the browser.
   */
  const getAccessToken =
    useCallback(async () => {
      const {
        data,
        error,
      } = await supabase.auth.getSession();

      if (
        error ||
        !data.session?.access_token
      ) {
        return null;
      }

      return data.session.access_token;
    }, [supabase]);

  /*
   * Load real marketplace categories from Supabase.
   */
  const fetchCategories =
    useCallback(async () => {
      setCategoriesLoading(true);

      try {
        const {
          data,
          error: categoryError,
        } = await supabase
          .from("categories")
          .select(
            "id, name, slug, type, description, sort_order, is_active"
          )
          .eq("is_active", true)
          .order("sort_order", {
            ascending: true,
          })
          .order("name", {
            ascending: true,
          });

        if (categoryError) {
          console.error(
            "Category fetch error:",
            categoryError
          );

          setError(
            "Unable to load marketplace categories."
          );

          return;
        }

        const normalized =
          ((data || []) as Category[]).filter(
            (category) =>
              category.type === "goods" ||
              category.type === "service"
          );

        setCategories(normalized);
      } catch (err) {
        console.error(
          "Category loading error:",
          err
        );

        setError(
          "Unable to load marketplace categories."
        );
      } finally {
        setCategoriesLoading(false);
      }
    }, [supabase]);

  /*
   * Load vendor listings.
   */
  const fetchListings =
    useCallback(async () => {
      if (!user) return;

      setLoading(true);
      setError(null);

      try {
        const token =
          await getAccessToken();

        if (!token) {
          setError(
            "Your session has expired. Please sign in again."
          );

          router.replace(
            "/auth?type=vendor"
          );

          return;
        }

        const response =
          await fetch(
            "/api/vendor/listings",
            {
              method: "GET",
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
              cache: "no-store",
            }
          );

        const result =
          await response.json();

        if (
          response.status === 401
        ) {
          router.replace(
            "/auth?type=vendor"
          );
          return;
        }

        if (!response.ok) {
          throw new Error(
            result.error ||
              "Failed to fetch listings"
          );
        }

        if (result.success) {
          setListings(
            (result.data ||
              []) as Listing[]
          );
        } else {
          throw new Error(
            result.error ||
              "Failed to fetch listings"
          );
        }
      } catch (err) {
        console.error(
          "Listings fetch error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load listings"
        );
      } finally {
        setLoading(false);
      }
    }, [
      user,
      getAccessToken,
      router,
    ]);

  useEffect(() => {
    if (
      authLoading ||
      !user ||
      role !== "vendor"
    ) {
      return;
    }

    fetchListings();
    fetchCategories();
  }, [
    authLoading,
    user,
    role,
    fetchListings,
    fetchCategories,
  ]);

  const resetForm = () => {
    setEditingListing(null);
    setFormTitle("");
    setFormDescription("");
    setFormPrice("");
    setFormPricePeriod("");
    setFormCategory("");
    setFormIsService(false);
    setFormTags("");
  };

  const openCreateModal = () => {
    resetForm();
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (
    listing: Listing
  ) => {
    setEditingListing(listing);
    setFormTitle(listing.title);
    setFormDescription(
      listing.description || ""
    );
    setFormPrice(
      listing.price !== null
        ? String(listing.price)
        : ""
    );
    setFormPricePeriod(
      listing.price_period || ""
    );
    setFormCategory(
      listing.category_id || ""
    );
    setFormIsService(
      listing.is_service
    );
    setFormTags(
      (listing.tags || []).join(", ")
    );
    setError(null);
    setShowModal(true);
  };

  /*
   * Change the category list automatically
   * when switching between products and services.
   */
  const handleTypeChange = (
    isService: boolean
  ) => {
    setFormIsService(isService);

    const currentCategory =
      categories.find(
        (category) =>
          category.id ===
          formCategory
      );

    if (
      currentCategory &&
      ((isService &&
        currentCategory.type !==
          "service") ||
        (!isService &&
          currentCategory.type !==
            "goods"))
    ) {
      setFormCategory("");
    }
  };

  const handleSave = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!user) {
      setError(
        "You must be signed in as a vendor."
      );
      return;
    }

    const title =
      formTitle.trim();

    if (!title) {
      setError(
        "Listing title is required."
      );
      return;
    }

    if (
      formDescription.trim()
        .length < 10
    ) {
      setError(
        "Please provide a more detailed description."
      );
      return;
    }

    if (
      formPrice &&
      (
        !Number.isFinite(
          Number(formPrice)
        ) ||
        Number(formPrice) < 0
      )
    ) {
      setError(
        "Please enter a valid price."
      );
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token =
        await getAccessToken();

      if (!token) {
        router.replace(
          "/auth?type=vendor"
        );
        return;
      }

      const tags =
        formTags
          .split(",")
          .map((tag) =>
            tag.trim()
          )
          .filter(Boolean)
          .slice(0, 20);

      const payload = {
        listingId:
          editingListing?.id,
        title,
        description:
          formDescription.trim(),
        price: formPrice
          ? Number(formPrice)
          : null,
        pricePeriod:
          formPricePeriod.trim() ||
          null,
        categoryId:
          formCategory || null,
        isService:
          formIsService,
        tags,
      };

      const response =
        await fetch(
          "/api/vendor/listings",
          {
            method:
              editingListing
                ? "PUT"
                : "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${token}`,
            },
            body:
              JSON.stringify(
                payload
              ),
          }
        );

      const result =
        await response.json();

      if (
        response.status === 401
      ) {
        router.replace(
          "/auth?type=vendor"
        );
        return;
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Failed to save listing"
        );
      }

      setShowModal(false);
      resetForm();

      toast.success(
        editingListing
          ? "Listing updated and sent for re-review."
          : "Listing created and submitted for review."
      );

      await fetchListings();
    } catch (err) {
      console.error(
        "Save listing error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to save listing"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (
    listingId: string
  ) => {
    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      const token =
        await getAccessToken();

      if (!token) {
        router.replace(
          "/auth?type=vendor"
        );
        return;
      }

      const response =
        await fetch(
          "/api/vendor/listings",
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${token}`,
            },
            body:
              JSON.stringify({
                listingId,
              }),
          }
        );

      const result =
        await response.json();

      if (
        response.status === 401
      ) {
        router.replace(
          "/auth?type=vendor"
        );
        return;
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Failed to delete listing"
        );
      }

      setDeleteConfirm(null);

      toast.success(
        "Listing deleted successfully."
      );

      await fetchListings();
    } catch (err) {
      console.error(
        "Delete listing error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete listing"
      );
    } finally {
      setSaving(false);
    }
  };

  const filteredListings =
    listings.filter((listing) => {
      const query =
        searchQuery
          .trim()
          .toLowerCase();

      const matchesSearch =
        !query ||
        listing.title
          .toLowerCase()
          .includes(query) ||
        (
          listing.description ||
          ""
        )
          .toLowerCase()
          .includes(query) ||
        (
          listing.tags || []
        ).some((tag) =>
          tag
            .toLowerCase()
            .includes(query)
        );

      const matchesStatus =
        statusFilter === "all" ||
        listing.status ===
          statusFilter;

      const matchesType =
        typeFilter === "all" ||
        (
          typeFilter ===
          "service"
            ? listing.is_service
            : !listing.is_service
        );

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType
      );
    });

  const statusCounts = {
    all: listings.length,
    pending_review:
      listings.filter(
        (listing) =>
          listing.status ===
          "pending_review"
      ).length,
    approved:
      listings.filter(
        (listing) =>
          listing.status ===
          "approved"
      ).length,
    rejected:
      listings.filter(
        (listing) =>
          listing.status ===
          "rejected"
      ).length,
    flagged:
      listings.filter(
        (listing) =>
          listing.status ===
          "flagged"
      ).length,
  };

  const goodsCategories =
    categories.filter(
      (category) =>
        category.type ===
        "goods"
    );

  const serviceCategories =
    categories.filter(
      (category) =>
        category.type ===
        "service"
    );

  const availableCategories =
    formIsService
      ? serviceCategories
      : goodsCategories;

  const getCategoryName = (
    categoryId: string | null
  ) => {
    if (!categoryId) {
      return null;
    }

    return (
      categories.find(
        (category) =>
          category.id ===
          categoryId
      )?.name || null
    );
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

  if (
    !user ||
    role !== "vendor"
  ) {
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
                    className="text-gray-400 hover:text-brand-navy transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Link>

                  <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy font-display">
                    Manage Listings
                  </h1>
                </div>

                <p className="text-gray-500 mt-1">
                  Add, edit, and manage
                  your products and
                  services
                </p>
              </div>

              <Button
                variant="gold"
                size="md"
                onClick={
                  openCreateModal
                }
              >
                <Plus className="h-4 w-4" />
                Add Listing
              </Button>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-accent-error/5 border border-accent-error/20 text-accent-error text-sm flex items-start justify-between gap-4">
                <span>{error}</span>

                <button
                  type="button"
                  onClick={() =>
                    setError(null)
                  }
                  className="shrink-0"
                  aria-label="Dismiss error"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Filters */}
            <div className="glass rounded-2xl p-4 mb-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Search */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />

                    <input
                      type="text"
                      value={
                        searchQuery
                      }
                      onChange={(event) =>
                        setSearchQuery(
                          event.target.value
                        )
                      }
                      placeholder="Search listings..."
                      className="w-full h-10 pl-9 pr-4 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent text-sm"
                    />
                  </div>

                  {/* Type filters */}
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        [
                          "all",
                          "All Types",
                        ],
                        [
                          "goods",
                          "Products",
                        ],
                        [
                          "service",
                          "Services",
                        ],
                      ] as const
                    ).map(
                      ([
                        type,
                        label,
                      ]) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() =>
                            setTypeFilter(
                              type
                            )
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            typeFilter ===
                            type
                              ? "bg-brand-navy text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {label}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Status filters */}
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      "all",
                      "pending_review",
                      "approved",
                      "rejected",
                      "flagged",
                    ] as const
                  ).map(
                    (status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() =>
                          setStatusFilter(
                            status
                          )
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          statusFilter ===
                          status
                            ? "bg-brand-navy text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {status ===
                        "all"
                          ? `All (${statusCounts.all})`
                          : `${STATUS_CONFIG[status].label} (${statusCounts[status]})`}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Listings */}
            {loading ? (
              <div className="glass rounded-2xl p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand-gold mx-auto mb-4" />

                <p className="text-gray-500">
                  Loading your
                  listings...
                </p>
              </div>
            ) : filteredListings.length ===
              0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />

                <h3 className="text-lg font-bold text-brand-navy mb-2">
                  {searchQuery ||
                  statusFilter !==
                    "all" ||
                  typeFilter !==
                    "all"
                    ? "No matching listings"
                    : "No listings yet"}
                </h3>

                <p className="text-gray-500 mb-6">
                  {searchQuery ||
                  statusFilter !==
                    "all" ||
                  typeFilter !==
                    "all"
                    ? "Try adjusting your search or filters."
                    : "Add your first product or service to start getting discovered."}
                </p>

                {!searchQuery &&
                  statusFilter ===
                    "all" &&
                  typeFilter ===
                    "all" && (
                    <Button
                      variant="gold"
                      onClick={
                        openCreateModal
                      }
                    >
                      <Plus className="h-4 w-4" />
                      Add Your First
                      Listing
                    </Button>
                  )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredListings.map(
                  (listing) => {
                    const statusConfig =
                      STATUS_CONFIG[
                        listing.status
                      ];

                    const StatusIcon =
                      statusConfig.icon;

                    const categoryName =
                      getCategoryName(
                        listing.category_id
                      );

                    return (
                      <div
                        key={
                          listing.id
                        }
                        className="glass rounded-2xl p-5 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start gap-4">
                          {/* Image */}
                          <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                            {listing
                              .image_urls
                              ?.[
                              0
                            ] ? (
                              <img
                                src={
                                  listing
                                    .image_urls[
                                    0
                                  ]
                                }
                                alt={
                                  listing.title
                                }
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="h-6 w-6 text-gray-300" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="font-bold text-brand-navy truncate">
                                  {
                                    listing.title
                                  }
                                </h3>

                                <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">
                                  {listing.description ||
                                    "No description"}
                                </p>
                              </div>

                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border shrink-0 ${statusConfig.color}`}
                              >
                                <StatusIcon className="h-3 w-3" />

                                {
                                  statusConfig.label
                                }
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-xs text-gray-500">
                              {categoryName && (
                                <span className="inline-flex items-center gap-1">
                                  <Tag className="h-3.5 w-3.5" />

                                  {
                                    categoryName
                                  }
                                </span>
                              )}

                              <span className="inline-flex items-center gap-1">
                                {listing.is_service ? (
                                  <>
                                    <Wrench className="h-3.5 w-3.5" />
                                    Service
                                  </>
                                ) : (
                                  <>
                                    <Package className="h-3.5 w-3.5" />
                                    Product
                                  </>
                                )}
                              </span>

                              {listing.price !==
                                null && (
                                <span className="font-semibold text-brand-navy">
                                  {formatNaira(
                                    Number(
                                      listing.price
                                    )
                                  )}

                                  {listing.price_period
                                    ? ` / ${listing.price_period}`
                                    : ""}
                                </span>
                              )}

                              <span className="inline-flex items-center gap-1">
                                <Eye className="h-3.5 w-3.5" />
                                {listing.view_count ||
                                  0}{" "}
                                views
                              </span>

                              <span>
                                {
                                  listing.contact_click_count ||
                                    0
                                }{" "}
                                contacts
                              </span>
                            </div>

                            {/* Status reason */}
                            {listing.status_reason && (
                              <div className="mt-3 p-3 rounded-lg bg-gray-50 border border-gray-100 text-xs text-gray-600">
                                <span className="font-semibold text-brand-navy">
                                  Review
                                  note:
                                </span>{" "}
                                {
                                  listing.status_reason
                                }
                              </div>
                            )}

                            {/* Tags */}
                            {listing.tags?.length >
                              0 && (
                              <div className="flex flex-wrap gap-1.5 mt-3">
                                {listing.tags
                                  .slice(
                                    0,
                                    6
                                  )
                                  .map(
                                    (
                                      tag
                                    ) => (
                                      <span
                                        key={
                                          tag
                                        }
                                        className="px-2 py-1 rounded-md bg-gray-100 text-gray-500 text-[11px]"
                                      >
                                        #
                                        {
                                          tag
                                        }
                                      </span>
                                    )
                                  )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
                          {listing.status ===
                            "approved" && (
                            <Link
                              href={`/marketplace/${listing.slug}`}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Link>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              openEditModal(
                                listing
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-brand-navy hover:bg-brand-navy/5 transition-colors"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setDeleteConfirm(
                                listing.id
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-accent-error hover:bg-accent-error/5 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </StaggerEntrance>
        </div>
      </main>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close modal"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-default"
            onClick={() =>
              !saving &&
              setShowModal(false)
            }
          />

          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
            <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-brand-navy">
                  {editingListing
                    ? "Edit Listing"
                    : "Create Listing"}
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  {editingListing
                    ? "Changes will be reviewed before the listing is published again."
                    : "Add a product or service to DBMartNG."}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  !saving &&
                  setShowModal(false)
                }
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={
                handleSave
              }
              className="p-6 space-y-5"
            >
              {/* Modal error */}
              {error && (
                <div className="p-3 rounded-xl bg-accent-error/5 border border-accent-error/20 text-accent-error text-sm">
                  {error}
                </div>
              )}

              {/* Type */}
              <div>
                <label className="block text-sm font-semibold text-brand-navy mb-2">
                  What are you
                  listing?
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      handleTypeChange(
                        false
                      )
                    }
                    className={`p-4 rounded-xl border text-left transition-all ${
                      !formIsService
                        ? "border-brand-gold bg-brand-gold/5 ring-1 ring-brand-gold"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Package className="h-5 w-5 text-brand-navy mb-2" />

                    <div className="font-semibold text-brand-navy">
                      Product
                    </div>

                    <div className="text-xs text-gray-500 mt-1">
                      Physical goods
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleTypeChange(
                        true
                      )
                    }
                    className={`p-4 rounded-xl border text-left transition-all ${
                      formIsService
                        ? "border-brand-gold bg-brand-gold/5 ring-1 ring-brand-gold"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Wrench className="h-5 w-5 text-brand-navy mb-2" />

                    <div className="font-semibold text-brand-navy">
                      Service
                    </div>

                    <div className="text-xs text-gray-500 mt-1">
                      Skills and professional
                      services
                    </div>
                  </button>
                </div>
              </div>

              {/* Title */}
              <div>
                <label
                  htmlFor="listing-title"
                  className="block text-sm font-semibold text-brand-navy mb-2"
                >
                  Title
                </label>

                <input
                  id="listing-title"
                  type="text"
                  value={
                    formTitle
                  }
                  onChange={(event) =>
                    setFormTitle(
                      event.target.value
                    )
                  }
                  maxLength={150}
                  placeholder={
                    formIsService
                      ? "e.g. Professional Makeup Services"
                      : "e.g. Premium Sneakers"
                  }
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent text-sm"
                  required
                />

                <p className="text-[11px] text-gray-400 mt-1">
                  {formTitle.length}/150
                </p>
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="listing-description"
                  className="block text-sm font-semibold text-brand-navy mb-2"
                >
                  Description
                </label>

                <textarea
                  id="listing-description"
                  value={
                    formDescription
                  }
                  onChange={(event) =>
                    setFormDescription(
                      event.target.value
                    )
                  }
                  maxLength={5000}
                  rows={5}
                  placeholder="Describe what you're offering, important details, quality, location, delivery options, or anything buyers should know."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent text-sm resize-none"
                  required
                />

                <p className="text-[11px] text-gray-400 mt-1">
                  {formDescription.length}
                  /5000
                </p>
              </div>

              {/* Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="listing-price"
                    className="block text-sm font-semibold text-brand-navy mb-2"
                  >
                    Price
                  </label>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                      ₦
                    </span>

                    <input
                      id="listing-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        formPrice
                      }
                      onChange={(
                        event
                      ) =>
                        setFormPrice(
                          event.target
                            .value
                        )
                      }
                      placeholder="0.00"
                      className="w-full h-11 pl-8 pr-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent text-sm"
                    />
                  </div>

                  <p className="text-[11px] text-gray-400 mt-1">
                    Leave blank if the
                    price is negotiable.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="listing-price-period"
                    className="block text-sm font-semibold text-brand-navy mb-2"
                  >
                    Price period
                  </label>

                  <select
                    id="listing-price-period"
                    value={
                      formPricePeriod
                    }
                    onChange={(
                      event
                    ) =>
                      setFormPricePeriod(
                        event.target
                          .value
                      )
                    }
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent text-sm"
                  >
                    <option value="">
                      One-time / not specified
                    </option>
                    <option value="hour">
                      Per hour
                    </option>
                    <option value="day">
                      Per day
                    </option>
                    <option value="week">
                      Per week
                    </option>
                    <option value="month">
                      Per month
                    </option>
                    <option value="session">
                      Per session
                    </option>
                    <option value="item">
                      Per item
                    </option>
                  </select>
                </div>
              </div>

              {/* Category */}
              <div>
                <label
                  htmlFor="listing-category"
                  className="block text-sm font-semibold text-brand-navy mb-2"
                >
                  Category
                </label>

                <select
                  id="listing-category"
                  value={
                    formCategory
                  }
                  onChange={(event) =>
                    setFormCategory(
                      event.target
                        .value
                    )
                  }
                  disabled={
                    categoriesLoading
                  }
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent text-sm disabled:opacity-60"
                >
                  <option value="">
                    {categoriesLoading
                      ? "Loading categories..."
                      : "Select a category"}
                  </option>

                  {availableCategories.map(
                    (category) => (
                      <option
                        key={
                          category.id
                        }
                        value={
                          category.id
                        }
                      >
                        {category.name}
                      </option>
                    )
                  )}
                </select>

                {!categoriesLoading &&
                  availableCategories.length ===
                    0 && (
                    <p className="text-xs text-accent-error mt-1">
                      No active{" "}
                      {formIsService
                        ? "service"
                        : "product"}{" "}
                      categories are
                      available.
                    </p>
                  )}
              </div>

              {/* Tags */}
              <div>
                <label
                  htmlFor="listing-tags"
                  className="block text-sm font-semibold text-brand-navy mb-2"
                >
                  Tags
                </label>

                <input
                  id="listing-tags"
                  type="text"
                  value={
                    formTags
                  }
                  onChange={(event) =>
                    setFormTags(
                      event.target
                        .value
                    )
                  }
                  placeholder="e.g. sneakers, fashion, men"
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent text-sm"
                />

                <p className="text-[11px] text-gray-400 mt-1">
                  Separate tags with
                  commas.
                </p>
              </div>

              {/* Moderation notice */}
              <div className="p-4 rounded-xl bg-brand-navy/5 border border-brand-navy/10">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-brand-gold shrink-0 mt-0.5" />

                  <div>
                    <p className="text-sm font-semibold text-brand-navy">
                      Marketplace review
                    </p>

                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      New listings and
                      edited listings are
                      reviewed before they
                      appear publicly. Keep
                      your description
                      accurate and avoid
                      prohibited or
                      misleading content.
                    </p>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setShowModal(false)
                  }
                  disabled={saving}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  variant="gold"
                  disabled={
                    saving ||
                    categoriesLoading
                  }
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      {editingListing
                        ? "Save Changes"
                        : "Create Listing"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close confirmation"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-default"
            onClick={() =>
              !saving &&
              setDeleteConfirm(
                null
              )
            }
          />

          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <div className="w-12 h-12 rounded-full bg-accent-error/10 flex items-center justify-center mb-4">
              <Trash2 className="h-6 w-6 text-accent-error" />
            </div>

            <h2 className="text-xl font-bold text-brand-navy">
              Delete listing?
            </h2>

            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              This action cannot be
              undone. The listing and
              its marketplace record
              will be permanently
              removed.
            </p>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setDeleteConfirm(
                    null
                  )
                }
                disabled={saving}
              >
                Cancel
              </Button>

              <button
                type="button"
                onClick={() =>
                  handleDelete(
                    deleteConfirm
                  )
                }
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-accent-error text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete Listing
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
