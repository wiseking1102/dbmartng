"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type ListingStatus = "pending_review" | "approved" | "rejected" | "flagged";

type Listing = {
  id: string;
  vendor_id: string;
  category_id: string | null;
  title: string;
  description: string;
  price: number | null;
  price_period: string | null;
  is_service: boolean;
  tags: string[] | null;
  status: ListingStatus;
  status_reason: string | null;
  created_at: string;
  updated_at: string;
  categories?: {
    id: string;
    name: string;
    type: "goods" | "services";
  } | null;
};

type Category = {
  id: string;
  name: string;
  slug: string;
  type: "goods" | "services";
  description: string | null;
  sort_order: number | null;
  is_active: boolean;
};

type FormState = {
  title: string;
  description: string;
  price: string;
  pricePeriod: string;
  categoryId: string;
  isService: boolean;
  tags: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  price: "",
  pricePeriod: "",
  categoryId: "",
  isService: false,
  tags: "",
};

const supabase = createClient();

function formatPrice(price: number | null) {
  if (price === null || Number.isNaN(price)) {
    return "Negotiable";
  }

  return `₦${new Intl.NumberFormat("en-NG").format(price)}`;
}

function formatDate(date: string) {
  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "";
  }

  return value.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusLabel(status: ListingStatus) {
  switch (status) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "flagged":
      return "Flagged";
    default:
      return "Pending review";
  }
}

function statusClass(status: ListingStatus) {
  switch (status) {
    case "approved":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "rejected":
      return "bg-red-50 text-red-700 border-red-200";
    case "flagged":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-blue-50 text-blue-700 border-blue-200";
  }
}

export default function VendorListingsPage() {
  const { user, role, loading: authLoading } = useAuth();

  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ListingStatus>(
    "all"
  );

  const [showModal, setShowModal] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const isVendor = role === "vendor";

  const loadCategories = useCallback(async (signal?: AbortSignal) => {
    const { data, error: categoryError } = await supabase
      .from("categories")
      .select(
        "id,name,slug,type,description,sort_order,is_active"
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (signal?.aborted) {
      return;
    }

    if (categoryError) {
      throw new Error(categoryError.message);
    }

    setCategories((data ?? []) as Category[]);
  }, []);

  const getAccessToken = useCallback(async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw new Error(sessionError.message);
    }

    if (!session?.access_token) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    return session.access_token;
  }, []);

  const loadListings = useCallback(
    async (signal?: AbortSignal) => {
      const token = await getAccessToken();

      const response = await fetch("/api/vendor/listings", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
        signal,
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error || "Failed to load your listings."
        );
      }

      if (signal?.aborted) {
        return;
      }

      setListings((payload?.listings ?? []) as Listing[]);
    },
    [getAccessToken]
  );

  const loadData = useCallback(
    async (signal?: AbortSignal) => {
      if (!isVendor || !user) {
        return;
      }

      setLoading(true);
      setError("");

      try {
        await Promise.all([
          loadListings(signal),
          loadCategories(signal),
        ]);
      } catch (err) {
        if (signal?.aborted) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load your listings."
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [isVendor, user, loadListings, loadCategories]
  );

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      window.location.replace("/auth");
      return;
    }

    if (role === "admin" || role === "sub_admin") {
      window.location.replace("/dashboard/admin");
      return;
    }

    if (role === "buyer") {
      window.location.replace("/dashboard/buyer");
      return;
    }

    if (role !== "vendor") {
      window.location.replace("/account");
    }
  }, [authLoading, user, role]);

  useEffect(() => {
    if (!authLoading && isVendor && user) {
      const controller = new AbortController();

      void loadData(controller.signal);

      return () => {
        controller.abort();
      };
    }
  }, [authLoading, isVendor, user, loadData]);

  const filteredListings = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return listings.filter((listing) => {
      const matchesStatus =
        statusFilter === "all" || listing.status === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        listing.title,
        listing.description,
        listing.categories?.name ?? "",
        ...(listing.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [listings, search, statusFilter]);

  const stats = useMemo(
    () => ({
      total: listings.length,
      approved: listings.filter((item) => item.status === "approved").length,
      pending: listings.filter(
        (item) => item.status === "pending_review"
      ).length,
      rejected: listings.filter((item) => item.status === "rejected").length,
      flagged: listings.filter((item) => item.status === "flagged").length,
    }),
    [listings]
  );

  const visibleCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.type === (form.isService ? "services" : "goods")
      ),
    [categories, form.isService]
  );

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingListing(null);
  }

  function openCreateModal() {
    resetForm();
    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function openEditModal(listing: Listing) {
    setEditingListing(listing);

    setForm({
      title: listing.title ?? "",
      description: listing.description ?? "",
      price:
        listing.price === null || listing.price === undefined
          ? ""
          : String(listing.price),
      pricePeriod: listing.price_period ?? "",
      categoryId: listing.category_id ?? "",
      isService: Boolean(listing.is_service),
      tags: (listing.tags ?? []).join(", "),
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setShowModal(false);
    resetForm();
  }

  function updateForm<K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleTypeChange(isService: boolean) {
    setForm((current) => ({
      ...current,
      isService,
      categoryId: "",
      pricePeriod: isService ? current.pricePeriod : "",
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const title = form.title.trim();
    const description = form.description.trim();

    if (!title) {
      setError("Please enter a listing title.");
      return;
    }

    if (!description) {
      setError("Please enter a description.");
      return;
    }

    if (!form.categoryId) {
      setError("Please select a category.");
      return;
    }

    let price: number | null = null;

    if (form.price.trim()) {
      const parsedPrice = Number(form.price.replace(/,/g, "").trim());

      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        setError("Please enter a valid price.");
        return;
      }

      price = parsedPrice;
    }

    const tags = form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 20);

    setSaving(true);

    try {
      const token = await getAccessToken();

      const body = {
        ...(editingListing ? { id: editingListing.id } : {}),
        title,
        description,
        price,
        pricePeriod: form.pricePeriod.trim() || null,
        categoryId: form.categoryId,
        isService: form.isService,
        tags,
      };

      const response = await fetch("/api/vendor/listings", {
        method: editingListing ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            (editingListing
              ? "Failed to update listing."
              : "Failed to create listing.")
        );
      }

      setSuccess(
        editingListing
          ? "Listing updated and sent for review."
          : "Listing created and sent for review."
      );

      setShowModal(false);
      resetForm();

      await loadListings();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while saving the listing."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(listing: Listing) {
    const confirmed = window.confirm(
      `Delete "${listing.title}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(listing.id);
    setError("");
    setSuccess("");

    try {
      const token = await getAccessToken();

      const response = await fetch(
        `/api/vendor/listings?id=${encodeURIComponent(listing.id)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error || "Failed to delete the listing."
        );
      }

      setListings((current) =>
        current.filter((item) => item.id !== listing.id)
      );

      setSuccess("Listing deleted successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while deleting the listing."
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-64 rounded-lg bg-gray-200" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 rounded-2xl bg-gray-200"
                />
              ))}
            </div>
            <div className="h-96 rounded-2xl bg-gray-200" />
          </div>
        </div>
      </main>
    );
  }

  if (!user || !isVendor) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">
              Vendor dashboard
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              My Listings
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage the products and services you offer on DBMartNG.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            + Add Listing
          </button>
        </header>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {stats.total}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Approved</p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">
              {stats.approved}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              {stats.pending}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Rejected</p>
            <p className="mt-2 text-3xl font-bold text-red-600">
              {stats.rejected}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Flagged</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">
              {stats.flagged}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex-1">
              <label htmlFor="listing-search" className="sr-only">
                Search listings
              </label>

              <input
                id="listing-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search your listings..."
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
              />
            </div>

            <div className="lg:w-56">
              <label htmlFor="status-filter" className="sr-only">
                Filter by status
              </label>

              <select
                id="status-filter"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as "all" | ListingStatus
                  )
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
              >
                <option value="all">All statuses</option>
                <option value="approved">Approved</option>
                <option value="pending_review">Pending review</option>
                <option value="rejected">Rejected</option>
                <option value="flagged">Flagged</option>
              </select>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          {filteredListings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-2xl">
                📦
              </div>

              <h2 className="mt-4 text-lg font-semibold text-gray-900">
                {listings.length === 0
                  ? "You have no listings yet"
                  : "No listings match your filters"}
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
                {listings.length === 0
                  ? "Create your first product or service listing to start selling on DBMartNG."
                  : "Try changing your search or status filter."}
              </p>

              {listings.length === 0 && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mt-5 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  Create your first listing
                </button>
              )}
            </div>
          ) : (
            filteredListings.map((listing) => (
              <article
                key={listing.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(
                          listing.status
                        )}`}
                      >
                        {statusLabel(listing.status)}
                      </span>

                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                        {listing.is_service ? "Service" : "Product"}
                      </span>

                      {listing.categories?.name && (
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                          {listing.categories.name}
                        </span>
                      )}
                    </div>

                    <h2 className="mt-3 break-words text-xl font-bold text-gray-900">
                      {listing.title}
                    </h2>

                    <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-gray-600">
                      {listing.description}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                      <span className="font-semibold text-gray-900">
                        {formatPrice(listing.price)}
                      </span>

                      {listing.price_period && (
                        <span className="text-gray-500">
                          {listing.price_period}
                        </span>
                      )}

                      <span className="text-gray-400">
                        Created {formatDate(listing.created_at)}
                      </span>
                    </div>

                    {(listing.tags ?? []).length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {(listing.tags ?? []).map((tag) => (
                          <span
                            key={`${listing.id}-${tag}`}
                            className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs text-gray-600"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {listing.status_reason && (
                      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Review note
                        </p>
                        <p className="mt-1 text-sm text-gray-700">
                          {listing.status_reason}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2 lg:ml-6">
                    <button
                      type="button"
                      onClick={() => openEditModal(listing)}
                      className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDelete(listing)}
                      disabled={deletingId === listing.id}
                      className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === listing.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="listing-modal-title"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4 sm:px-6">
              <div>
                <h2
                  id="listing-modal-title"
                  className="text-lg font-bold text-gray-900"
                >
                  {editingListing ? "Edit listing" : "Create listing"}
                </h2>

                <p className="mt-0.5 text-xs text-gray-500">
                  Listings are reviewed before being published.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close"
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
              <div>
                <label
                  htmlFor="listing-title"
                  className="mb-2 block text-sm font-semibold text-gray-800"
                >
                  Title
                </label>

                <input
                  id="listing-title"
                  value={form.title}
                  onChange={(event) =>
                    updateForm("title", event.target.value)
                  }
                  maxLength={150}
                  placeholder={
                    form.isService
                      ? "e.g. Professional graphic design"
                      : "e.g. Premium wireless headphones"
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-800">
                  Listing type
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleTypeChange(false)}
                    className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      !form.isService
                        ? "border-black bg-black text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Product
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTypeChange(true)}
                    className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      form.isService
                        ? "border-black bg-black text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Service
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="listing-category"
                  className="mb-2 block text-sm font-semibold text-gray-800"
                >
                  Category
                </label>

                <select
                  id="listing-category"
                  value={form.categoryId}
                  onChange={(event) =>
                    updateForm("categoryId", event.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                  required
                >
                  <option value="">Select a category</option>

                  {visibleCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>

                {visibleCategories.length === 0 && (
                  <p className="mt-2 text-xs text-amber-600">
                    No active categories are available for this listing type.
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="listing-description"
                  className="mb-2 block text-sm font-semibold text-gray-800"
                >
                  Description
                </label>

                <textarea
                  id="listing-description"
                  value={form.description}
                  onChange={(event) =>
                    updateForm("description", event.target.value)
                  }
                  rows={6}
                  maxLength={5000}
                  placeholder="Describe what you are offering, including important details buyers should know."
                  className="w-full resize-y rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                  required
                />

                <p className="mt-1 text-right text-xs text-gray-400">
                  {form.description.length}/5000
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="listing-price"
                    className="mb-2 block text-sm font-semibold text-gray-800"
                  >
                    Price
                  </label>

                  <input
                    id="listing-price"
                    type="text"
                    inputMode="decimal"
                    value={form.price}
                    onChange={(event) =>
                      updateForm("price", event.target.value)
                    }
                    placeholder="e.g. 25000"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                  />

                  <p className="mt-1 text-xs text-gray-400">
                    Leave blank if the price is negotiable.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="listing-price-period"
                    className="mb-2 block text-sm font-semibold text-gray-800"
                  >
                    Price period
                  </label>

                  <select
                    id="listing-price-period"
                    value={form.pricePeriod}
                    onChange={(event) =>
                      updateForm("pricePeriod", event.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                  >
                    <option value="">One-time / not specified</option>
                    <option value="per hour">Per hour</option>
                    <option value="per day">Per day</option>
                    <option value="per week">Per week</option>
                    <option value="per month">Per month</option>
                    <option value="per project">Per project</option>
                    <option value="per item">Per item</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="listing-tags"
                  className="mb-2 block text-sm font-semibold text-gray-800"
                >
                  Tags
                </label>

                <input
                  id="listing-tags"
                  value={form.tags}
                  onChange={(event) =>
                    updateForm("tags", event.target.value)
                  }
                  placeholder="e.g. fashion, affordable, delivery"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                />

                <p className="mt-1 text-xs text-gray-400">
                  Separate tags with commas. Maximum 20 tags.
                </p>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || visibleCategories.length === 0}
                  className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingListing
                      ? "Update listing"
                      : "Create listing"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type ListingStatus = "pending_review" | "approved" | "rejected" | "flagged";

type Listing = {
  id: string;
  vendor_id: string;
  category_id: string | null;
  title: string;
  description: string;
  price: number | null;
  price_period: string | null;
  is_service: boolean;
  tags: string[] | null;
  status: ListingStatus;
  status_reason: string | null;
  created_at: string;
  updated_at: string;
  categories?: {
    id: string;
    name: string;
    type: "goods" | "services";
  } | null;
};

type Category = {
  id: string;
  name: string;
  slug: string;
  type: "goods" | "services";
  description: string | null;
  sort_order: number | null;
  is_active: boolean;
};

type FormState = {
  title: string;
  description: string;
  price: string;
  pricePeriod: string;
  categoryId: string;
  isService: boolean;
  tags: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  price: "",
  pricePeriod: "",
  categoryId: "",
  isService: false,
  tags: "",
};

const supabase = createClient();

function formatPrice(price: number | null) {
  if (price === null || Number.isNaN(price)) {
    return "Negotiable";
  }

  return `₦${new Intl.NumberFormat("en-NG").format(price)}`;
}

function formatDate(date: string) {
  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "";
  }

  return value.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusLabel(status: ListingStatus) {
  switch (status) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "flagged":
      return "Flagged";
    default:
      return "Pending review";
  }
}

function statusClass(status: ListingStatus) {
  switch (status) {
    case "approved":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "rejected":
      return "bg-red-50 text-red-700 border-red-200";
    case "flagged":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-blue-50 text-blue-700 border-blue-200";
  }
}

export default function VendorListingsPage() {
  const { user, role, loading: authLoading } = useAuth();

  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ListingStatus>(
    "all"
  );

  const [showModal, setShowModal] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const isVendor = role === "vendor";

  const loadCategories = useCallback(async (signal?: AbortSignal) => {
    const { data, error: categoryError } = await supabase
      .from("categories")
      .select(
        "id,name,slug,type,description,sort_order,is_active"
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (signal?.aborted) {
      return;
    }

    if (categoryError) {
      throw new Error(categoryError.message);
    }

    setCategories((data ?? []) as Category[]);
  }, []);

  const getAccessToken = useCallback(async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw new Error(sessionError.message);
    }

    if (!session?.access_token) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    return session.access_token;
  }, []);

  const loadListings = useCallback(
    async (signal?: AbortSignal) => {
      const token = await getAccessToken();

      const response = await fetch("/api/vendor/listings", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
        signal,
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error || "Failed to load your listings."
        );
      }

      if (signal?.aborted) {
        return;
      }

      setListings((payload?.listings ?? []) as Listing[]);
    },
    [getAccessToken]
  );

  const loadData = useCallback(
    async (signal?: AbortSignal) => {
      if (!isVendor || !user) {
        return;
      }

      setLoading(true);
      setError("");

      try {
        await Promise.all([
          loadListings(signal),
          loadCategories(signal),
        ]);
      } catch (err) {
        if (signal?.aborted) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load your listings."
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [isVendor, user, loadListings, loadCategories]
  );

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      window.location.replace("/auth");
      return;
    }

    if (role === "admin" || role === "sub_admin") {
      window.location.replace("/dashboard/admin");
      return;
    }

    if (role === "buyer") {
      window.location.replace("/dashboard/buyer");
      return;
    }

    if (role !== "vendor") {
      window.location.replace("/account");
    }
  }, [authLoading, user, role]);

  useEffect(() => {
    if (!authLoading && isVendor && user) {
      const controller = new AbortController();

      void loadData(controller.signal);

      return () => {
        controller.abort();
      };
    }
  }, [authLoading, isVendor, user, loadData]);

  const filteredListings = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return listings.filter((listing) => {
      const matchesStatus =
        statusFilter === "all" || listing.status === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        listing.title,
        listing.description,
        listing.categories?.name ?? "",
        ...(listing.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [listings, search, statusFilter]);

  const stats = useMemo(
    () => ({
      total: listings.length,
      approved: listings.filter((item) => item.status === "approved").length,
      pending: listings.filter(
        (item) => item.status === "pending_review"
      ).length,
      rejected: listings.filter((item) => item.status === "rejected").length,
      flagged: listings.filter((item) => item.status === "flagged").length,
    }),
    [listings]
  );

  const visibleCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.type === (form.isService ? "services" : "goods")
      ),
    [categories, form.isService]
  );

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingListing(null);
  }

  function openCreateModal() {
    resetForm();
    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function openEditModal(listing: Listing) {
    setEditingListing(listing);

    setForm({
      title: listing.title ?? "",
      description: listing.description ?? "",
      price:
        listing.price === null || listing.price === undefined
          ? ""
          : String(listing.price),
      pricePeriod: listing.price_period ?? "",
      categoryId: listing.category_id ?? "",
      isService: Boolean(listing.is_service),
      tags: (listing.tags ?? []).join(", "),
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setShowModal(false);
    resetForm();
  }

  function updateForm<K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleTypeChange(isService: boolean) {
    setForm((current) => ({
      ...current,
      isService,
      categoryId: "",
      pricePeriod: isService ? current.pricePeriod : "",
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const title = form.title.trim();
    const description = form.description.trim();

    if (!title) {
      setError("Please enter a listing title.");
      return;
    }

    if (!description) {
      setError("Please enter a description.");
      return;
    }

    if (!form.categoryId) {
      setError("Please select a category.");
      return;
    }

    let price: number | null = null;

    if (form.price.trim()) {
      const parsedPrice = Number(form.price.replace(/,/g, "").trim());

      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        setError("Please enter a valid price.");
        return;
      }

      price = parsedPrice;
    }

    const tags = form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 20);

    setSaving(true);

    try {
      const token = await getAccessToken();

      const body = {
        ...(editingListing ? { id: editingListing.id } : {}),
        title,
        description,
        price,
        pricePeriod: form.pricePeriod.trim() || null,
        categoryId: form.categoryId,
        isService: form.isService,
        tags,
      };

      const response = await fetch("/api/vendor/listings", {
        method: editingListing ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            (editingListing
              ? "Failed to update listing."
              : "Failed to create listing.")
        );
      }

      setSuccess(
        editingListing
          ? "Listing updated and sent for review."
          : "Listing created and sent for review."
      );

      setShowModal(false);
      resetForm();

      await loadListings();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while saving the listing."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(listing: Listing) {
    const confirmed = window.confirm(
      `Delete "${listing.title}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(listing.id);
    setError("");
    setSuccess("");

    try {
      const token = await getAccessToken();

      const response = await fetch(
        `/api/vendor/listings?id=${encodeURIComponent(listing.id)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error || "Failed to delete the listing."
        );
      }

      setListings((current) =>
        current.filter((item) => item.id !== listing.id)
      );

      setSuccess("Listing deleted successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while deleting the listing."
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-64 rounded-lg bg-gray-200" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 rounded-2xl bg-gray-200"
                />
              ))}
            </div>
            <div className="h-96 rounded-2xl bg-gray-200" />
          </div>
        </div>
      </main>
    );
  }

  if (!user || !isVendor) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">
              Vendor dashboard
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              My Listings
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage the products and services you offer on DBMartNG.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            + Add Listing
          </button>
        </header>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {stats.total}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Approved</p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">
              {stats.approved}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              {stats.pending}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Rejected</p>
            <p className="mt-2 text-3xl font-bold text-red-600">
              {stats.rejected}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Flagged</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">
              {stats.flagged}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex-1">
              <label htmlFor="listing-search" className="sr-only">
                Search listings
              </label>

              <input
                id="listing-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search your listings..."
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
              />
            </div>

            <div className="lg:w-56">
              <label htmlFor="status-filter" className="sr-only">
                Filter by status
              </label>

              <select
                id="status-filter"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as "all" | ListingStatus
                  )
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
              >
                <option value="all">All statuses</option>
                <option value="approved">Approved</option>
                <option value="pending_review">Pending review</option>
                <option value="rejected">Rejected</option>
                <option value="flagged">Flagged</option>
              </select>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          {filteredListings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-2xl">
                📦
              </div>

              <h2 className="mt-4 text-lg font-semibold text-gray-900">
                {listings.length === 0
                  ? "You have no listings yet"
                  : "No listings match your filters"}
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
                {listings.length === 0
                  ? "Create your first product or service listing to start selling on DBMartNG."
                  : "Try changing your search or status filter."}
              </p>

              {listings.length === 0 && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mt-5 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  Create your first listing
                </button>
              )}
            </div>
          ) : (
            filteredListings.map((listing) => (
              <article
                key={listing.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(
                          listing.status
                        )}`}
                      >
                        {statusLabel(listing.status)}
                      </span>

                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                        {listing.is_service ? "Service" : "Product"}
                      </span>

                      {listing.categories?.name && (
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                          {listing.categories.name}
                        </span>
                      )}
                    </div>

                    <h2 className="mt-3 break-words text-xl font-bold text-gray-900">
                      {listing.title}
                    </h2>

                    <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-gray-600">
                      {listing.description}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                      <span className="font-semibold text-gray-900">
                        {formatPrice(listing.price)}
                      </span>

                      {listing.price_period && (
                        <span className="text-gray-500">
                          {listing.price_period}
                        </span>
                      )}

                      <span className="text-gray-400">
                        Created {formatDate(listing.created_at)}
                      </span>
                    </div>

                    {(listing.tags ?? []).length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {(listing.tags ?? []).map((tag) => (
                          <span
                            key={`${listing.id}-${tag}`}
                            className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs text-gray-600"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {listing.status_reason && (
                      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Review note
                        </p>
                        <p className="mt-1 text-sm text-gray-700">
                          {listing.status_reason}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2 lg:ml-6">
                    <button
                      type="button"
                      onClick={() => openEditModal(listing)}
                      className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDelete(listing)}
                      disabled={deletingId === listing.id}
                      className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === listing.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="listing-modal-title"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4 sm:px-6">
              <div>
                <h2
                  id="listing-modal-title"
                  className="text-lg font-bold text-gray-900"
                >
                  {editingListing ? "Edit listing" : "Create listing"}
                </h2>

                <p className="mt-0.5 text-xs text-gray-500">
                  Listings are reviewed before being published.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close"
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
              <div>
                <label
                  htmlFor="listing-title"
                  className="mb-2 block text-sm font-semibold text-gray-800"
                >
                  Title
                </label>

                <input
                  id="listing-title"
                  value={form.title}
                  onChange={(event) =>
                    updateForm("title", event.target.value)
                  }
                  maxLength={150}
                  placeholder={
                    form.isService
                      ? "e.g. Professional graphic design"
                      : "e.g. Premium wireless headphones"
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-800">
                  Listing type
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleTypeChange(false)}
                    className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      !form.isService
                        ? "border-black bg-black text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Product
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTypeChange(true)}
                    className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      form.isService
                        ? "border-black bg-black text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Service
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="listing-category"
                  className="mb-2 block text-sm font-semibold text-gray-800"
                >
                  Category
                </label>

                <select
                  id="listing-category"
                  value={form.categoryId}
                  onChange={(event) =>
                    updateForm("categoryId", event.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                  required
                >
                  <option value="">Select a category</option>

                  {visibleCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>

                {visibleCategories.length === 0 && (
                  <p className="mt-2 text-xs text-amber-600">
                    No active categories are available for this listing type.
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="listing-description"
                  className="mb-2 block text-sm font-semibold text-gray-800"
                >
                  Description
                </label>

                <textarea
                  id="listing-description"
                  value={form.description}
                  onChange={(event) =>
                    updateForm("description", event.target.value)
                  }
                  rows={6}
                  maxLength={5000}
                  placeholder="Describe what you are offering, including important details buyers should know."
                  className="w-full resize-y rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                  required
                />

                <p className="mt-1 text-right text-xs text-gray-400">
                  {form.description.length}/5000
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="listing-price"
                    className="mb-2 block text-sm font-semibold text-gray-800"
                  >
                    Price
                  </label>

                  <input
                    id="listing-price"
                    type="text"
                    inputMode="decimal"
                    value={form.price}
                    onChange={(event) =>
                      updateForm("price", event.target.value)
                    }
                    placeholder="e.g. 25000"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                  />

                  <p className="mt-1 text-xs text-gray-400">
                    Leave blank if the price is negotiable.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="listing-price-period"
                    className="mb-2 block text-sm font-semibold text-gray-800"
                  >
                    Price period
                  </label>

                  <select
                    id="listing-price-period"
                    value={form.pricePeriod}
                    onChange={(event) =>
                      updateForm("pricePeriod", event.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                  >
                    <option value="">One-time / not specified</option>
                    <option value="per hour">Per hour</option>
                    <option value="per day">Per day</option>
                    <option value="per week">Per week</option>
                    <option value="per month">Per month</option>
                    <option value="per project">Per project</option>
                    <option value="per item">Per item</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="listing-tags"
                  className="mb-2 block text-sm font-semibold text-gray-800"
                >
                  Tags
                </label>

                <input
                  id="listing-tags"
                  value={form.tags}
                  onChange={(event) =>
                    updateForm("tags", event.target.value)
                  }
                  placeholder="e.g. fashion, affordable, delivery"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10"
                />

                <p className="mt-1 text-xs text-gray-400">
                  Separate tags with commas. Maximum 20 tags.
                </p>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || visibleCategories.length === 0}
                  className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingListing
                      ? "Update listing"
                      : "Create listing"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
