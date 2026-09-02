"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import StaggerEntrance from "@/components/animations/StaggerEntrance";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  ChevronLeft,
  Plus,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  Tag,
} from "lucide-react";

type ListingType = "product" | "service";

type Category = {
  id: string;
  name: string;
  slug?: string | null;
  type: "goods" | "service";
  description?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
};

type VendorProfile = {
  id: string;
  user_id: string;
  is_vip?: boolean | null;
};

export default function NewListingPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [categories, setCategories] = useState<Category[]>([]);
  const [vendorProfile, setVendorProfile] = useState<VendorProfile | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [pricePeriod, setPricePeriod] = useState("one_time");
  const [categoryId, setCategoryId] = useState("");
  const [listingType, setListingType] = useState<ListingType>("product");

  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const [imageUrl, setImageUrl] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  /*
   * Vendor listing creation is vendor-only.
   * Admins and sub-admins have their own dashboard and should not
   * create listings through the vendor workflow.
   */
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/auth?type=vendor");
      return;
    }

    if (role !== "vendor") {
      router.replace(
        role === "admin" || role === "sub_admin"
          ? "/dashboard/admin"
          : "/dashboard/buyer"
      );
    }
  }, [user, role, authLoading, router]);

  /*
   * Load vendor profile and categories.
   *
   * Categories are public/active database records, so they should be
   * fetched independently from the vendor profile. This prevents a
   * missing profile from making the category selector silently empty.
   */
  useEffect(() => {
    if (authLoading || !user || role !== "vendor") {
      if (!authLoading && role !== "vendor") {
        setLoading(false);
      }
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setCategoriesLoading(true);
      setCategoriesError("");

      try {
        const [profileResult, categoriesResult] = await Promise.all([
          supabase
            .from("vendor_profiles")
            .select("id, user_id, is_vip")
            .eq("user_id", user.id)
            .maybeSingle(),

          supabase
            .from("categories")
            .select(
              "id, name, slug, type, description, sort_order, is_active"
            )
            .eq("is_active", true)
            .order("sort_order", {
              ascending: true,
              nullsFirst: false,
            })
            .order("name", {
              ascending: true,
            }),
        ]);

        if (cancelled) return;

        if (profileResult.error) {
          console.error(
            "Failed to load vendor profile:",
            profileResult.error
          );
          toast.error(
            "Unable to load your vendor profile. Please complete onboarding."
          );
        } else if (profileResult.data) {
          setVendorProfile(profileResult.data as VendorProfile);
        }

        if (categoriesResult.error) {
          console.error(
            "Failed to load categories:",
            categoriesResult.error
          );

          setCategories([]);
          setCategoriesError(
            "We couldn't load listing categories. Please refresh the page and try again."
          );
        } else {
          const activeCategories = (
            (categoriesResult.data || []) as Category[]
          ).filter((category) => category.is_active !== false);

          setCategories(activeCategories);

          if (activeCategories.length === 0) {
            setCategoriesError(
              "No active categories are currently available."
            );
          }
        }
      } catch (error) {
        console.error("Error loading listing data:", error);

        if (!cancelled) {
          setCategoriesError(
            "Something went wrong while loading categories. Please refresh the page."
          );
        }
      } finally {
        if (!cancelled) {
          setCategoriesLoading(false);
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, role, supabase]);

  /*
   * Only display categories matching the selected listing type.
   *
   * Product -> goods
   * Service -> service
   */
  const filteredCategories = useMemo(() => {
    const expectedType = listingType === "service" ? "service" : "goods";

    return categories.filter((category) => category.type === expectedType);
  }, [categories, listingType]);

  /*
   * If the vendor switches from Product to Service, don't leave a
   * Product category selected. The selected category must always match
   * the listing type.
   */
  useEffect(() => {
    if (!categoryId) return;

    const stillValid = filteredCategories.some(
      (category) => category.id === categoryId
    );

    if (!stillValid) {
      setCategoryId("");
    }
  }, [categoryId, filteredCategories]);

  const handleAddTag = useCallback(() => {
    const trimmed = tagInput
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");

    if (!trimmed) return;

    if (tags.includes(trimmed)) {
      toast.info("That tag has already been added.");
      return;
    }

    if (tags.length >= 10) {
      toast.error("You can add up to 10 tags.");
      return;
    }

    setTags((current) => [...current, trimmed]);
    setTagInput("");
  }, [tagInput, tags]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags((current) => current.filter((tag) => tag !== tagToRemove));
  }, []);

  const handleAddImageUrl = useCallback(() => {
    const trimmed = imageUrl.trim();

    if (!trimmed) {
      toast.error("Please enter an image URL.");
      return;
    }

    try {
      const parsed = new URL(trimmed);

      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("Invalid protocol");
      }
    } catch {
      toast.error("Please enter a valid Image URL.");
      return;
    }

    if (imageUrls.includes(trimmed)) {
      toast.info("That image has already been added.");
      return;
    }

    if (imageUrls.length >= 8) {
      toast.error("You can add up to 8 images.");
      return;
    }

    setImageUrls((current) => [...current, trimmed]);
    setImageUrl("");
  }, [imageUrl, imageUrls]);

  const handleRemoveImage = useCallback((index: number) => {
    setImageUrls((current) => current.filter((_, i) => i !== index));
  }, []);

  const handleListingTypeChange = (type: ListingType) => {
    setListingType(type);
    setCategoryId("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || role !== "vendor") {
      toast.error("Only vendors can create listings.");
      return;
    }

    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }

    if (title.trim().length < 3) {
      toast.error("Title must be at least 3 characters.");
      return;
    }

    if (!description.trim()) {
      toast.error("Description is required.");
      return;
    }

    if (description.trim().length < 20) {
      toast.error("Please provide a more detailed description.");
      return;
    }

    if (!categoryId) {
      toast.error("Please select a category.");
      return;
    }

    const selectedCategory = categories.find(
      (category) => category.id === categoryId
    );

    if (!selectedCategory) {
      toast.error("Selected category could not be found.");
      return;
    }

    const expectedCategoryType =
      listingType === "service" ? "service" : "goods";

    if (selectedCategory.type !== expectedCategoryType) {
      toast.error(
        "The selected category does not match the listing type."
      );
      return;
    }

    if (!vendorProfile) {
      toast.error(
        "Vendor profile not found. Please complete your vendor onboarding first."
      );
      return;
    }

    const parsedPrice = price.trim() ? Number(price) : null;

    if (parsedPrice !== null && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) {
      toast.error("Please enter a valid price.");
      return;
    }

    setSubmitting(true);

    try {
      /*
       * Check text moderation before creating the listing.
       */
      try {
        const modRes = await fetch("/api/moderation", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: `${title} ${description}`,
          }),
        });

        if (modRes.ok) {
          const modData = await modRes.json();

          if (modData.flagged) {
            throw new Error(
              `Content flagged for policy violation: ${
                modData.reason || "Inappropriate text"
              }`
            );
          }
        }
      } catch (moderationError: any) {
        /*
         * If the moderation endpoint explicitly rejects the content,
         * stop submission. Network/API failure alone should not make
         * the listing creator unusable.
         */
        if (
          moderationError?.message?.toLowerCase().includes("policy violation")
        ) {
          throw moderationError;
        }

        console.warn(
          "Moderation check unavailable, continuing:",
          moderationError
        );
      }

      /*
       * Generate a reasonably unique slug.
       */
      const baseSlug =
        title
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "") || "listing";

      const slug = `${baseSlug}-${Date.now().toString(36)}`;

      /*
       * VIP vendors can publish immediately.
       * Normal vendors enter the review workflow.
       */
      const initialStatus = vendorProfile.is_vip
        ? "approved"
        : "pending_review";

      const finalImageUrls =
        imageUrls.length > 0
          ? imageUrls
          : [
              "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99e?w=1200&auto=format&fit=crop&q=80",
            ];

      const { error: insertError } = await supabase
        .from("listings")
        .insert({
          vendor_id: vendorProfile.id,
          title: title.trim(),
          slug,
          description: description.trim(),
          price: parsedPrice,
          price_period: pricePeriod,
          category_id: categoryId,
          is_service: listingType === "service",
          tags,
          image_urls: finalImageUrls,
          status: initialStatus,
        } as never);

      if (insertError) {
        throw insertError;
      }

      if (vendorProfile.is_vip) {
        toast.success(
          "Listing published live immediately. VIP privilege applied!"
        );
      } else {
        toast.success(
          "Listing submitted for review. It will go live once approved."
        );
      }

      router.replace("/dashboard/vendor/listings");
    } catch (err: any) {
      console.error("Failed to create listing:", err);

      toast.error(
        err?.message || "Failed to create listing. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <>
        <Header />

        <div className="pt-20 min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
            <p className="text-sm text-gray-500">
              Loading listing creator...
            </p>
          </div>
        </div>
      </>
    );
  }

  if (!user || role !== "vendor") {
    return (
      <>
        <Header />

        <div className="pt-20 min-h-screen flex items-center justify-center px-4">
          <div className="text-center">
            <AlertCircle className="h-10 w-10 mx-auto mb-3 text-red-500" />

            <h1 className="text-xl font-bold text-brand-navy">
              Vendor access required
            </h1>

            <p className="text-sm text-gray-500 mt-2">
              Redirecting you to the correct dashboard...
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="pt-20 min-h-screen bg-surface-secondary pb-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
          <StaggerEntrance>
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
              <Link
                href="/dashboard/vendor/listings"
                className="text-gray-400 hover:text-brand-navy transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>

              <div>
                <h1 className="text-2xl font-bold text-brand-navy font-display">
                  Create New Listing
                </h1>

                <p className="text-sm text-gray-500">
                  Add a product or service to your public store
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Details */}
              <div className="glass rounded-3xl p-6 sm:p-8 space-y-5">
                <h2 className="text-lg font-bold text-brand-navy font-display border-b border-gray-100 pb-3">
                  Basic Details
                </h2>

                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-brand-navy mb-1">
                    Title *
                  </label>

                  <input
                    type="text"
                    required
                    maxLength={120}
                    placeholder="e.g. MacBook Pro 14-inch M3 or Bridal Makeup Package"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold bg-white"
                  />

                  <p className="text-xs text-gray-400 mt-1">
                    {title.length}/120 characters
                  </p>
                </div>

                {/* Listing Type */}
                <div>
                  <label className="block text-sm font-semibold text-brand-navy mb-2">
                    What are you listing? *
                  </label>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleListingTypeChange("product")}
                      className={`text-left rounded-2xl border p-4 transition-all ${
                        listingType === "product"
                          ? "border-brand-gold bg-brand-gold/10 ring-2 ring-brand-gold/20"
                          : "border-gray-200 bg-white hover:border-brand-gold/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                            listingType === "product"
                              ? "bg-brand-gold/20 text-brand-navy"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          <Tag className="h-5 w-5" />
                        </div>

                        <div>
                          <p className="font-semibold text-brand-navy">
                            Physical Product
                          </p>
                          <p className="text-xs text-gray-500">
                            Goods you sell
                          </p>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleListingTypeChange("service")}
                      className={`text-left rounded-2xl border p-4 transition-all ${
                        listingType === "service"
                          ? "border-brand-gold bg-brand-gold/10 ring-2 ring-brand-gold/20"
                          : "border-gray-200 bg-white hover:border-brand-gold/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                            listingType === "service"
                              ? "bg-brand-gold/20 text-brand-navy"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          <CheckCircle className="h-5 w-5" />
                        </div>

                        <div>
                          <p className="font-semibold text-brand-navy">
                            Service
                          </p>
                          <p className="text-xs text-gray-500">
                            Services you provide
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-semibold text-brand-navy mb-1">
                    Category *
                  </label>

                  {categoriesLoading ? (
                    <div className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading categories...
                    </div>
                  ) : categoriesError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />

                        <div>
                          <p className="text-sm font-semibold text-red-700">
                            Categories unavailable
                          </p>

                          <p className="text-sm text-red-600 mt-1">
                            {categoriesError}
                          </p>

                          <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="mt-3 text-sm font-semibold text-red-700 underline"
                          >
                            Refresh page
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : filteredCategories.length === 0 ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />

                        <div>
                          <p className="text-sm font-semibold text-amber-800">
                            No {listingType === "service" ? "service" : "product"}{" "}
                            categories available
                          </p>

                          <p className="text-sm text-amber-700 mt-1">
                            Please try the other listing type or refresh the
                            page.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <select
                        required
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold bg-white"
                      >
                        <option value="">
                          Select a{" "}
                          {listingType === "service"
                            ? "service"
                            : "product"}{" "}
                          category
                        </option>

                        {filteredCategories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>

                      <p className="text-xs text-gray-500 mt-1">
                        Showing {filteredCategories.length}{" "}
                        {listingType === "service"
                          ? "service"
                          : "product"}{" "}
                        categor
                        {filteredCategories.length === 1 ? "y" : "ies"}.
                      </p>
                    </>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-brand-navy mb-1">
                    Description *
                  </label>

                  <textarea
                    required
                    rows={5}
                    maxLength={5000}
                    placeholder="Provide a detailed description of your product or service..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold bg-white resize-y"
                  />

                  <p className="text-xs text-gray-400 mt-1">
                    {description.length}/5000 characters
                  </p>
                </div>
              </div>

              {/* Pricing */}
              <div className="glass rounded-3xl p-6 sm:p-8 space-y-5">
                <h2 className="text-lg font-bold text-brand-navy font-display border-b border-gray-100 pb-3">
                  Pricing
                </h2>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-brand-navy mb-1">
                      Price (NGN)
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="e.g. 50000"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold bg-white"
                    />

                    <p className="text-xs text-gray-500 mt-1">
                      Leave blank for "Contact for Price".
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-brand-navy mb-1">
                      Pricing Period
                    </label>

                    <select
                      value={pricePeriod}
                      onChange={(e) => setPricePeriod(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold bg-white"
                    >
                      <option value="one_time">One-time payment</option>
                      <option value="hour">Per Hour</option>
                      <option value="day">Per Day</option>
                      <option value="week">Per Week</option>
                      <option value="month">Per Month</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Images */}
              <div className="glass rounded-3xl p-6 sm:p-8 space-y-5">
                <h2 className="text-lg font-bold text-brand-navy font-display border-b border-gray-100 pb-3">
                  Images
                </h2>

                <div>
                  <label className="block text-sm font-semibold text-brand-navy mb-1">
                    Image URL
                  </label>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="url"
                      placeholder="https://..."
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddImageUrl();
                        }
                      }}
                      className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold bg-white"
                    />

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddImageUrl}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>

                  <p className="text-xs text-gray-500 mt-1">
                    Add direct image links. You can add up to 8 images.
                  </p>
                </div>

                {imageUrls.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    {imageUrls.map((url, index) => (
                      <div
                        key={`${url}-${index}`}
                        className="relative aspect-square rounded-2xl overflow-hidden border border-gray-200 group bg-gray-100"
                      >
                        <img
                          src={url}
                          alt={`Listing preview ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.opacity = "0.35";
                          }}
                        />

                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          aria-label={`Remove image ${index + 1}`}
                          className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full opacity-90 hover:opacity-100"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>

                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-2 py-1">
                          Image {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tags */}
              <div className="glass rounded-3xl p-6 sm:p-8 space-y-5">
                <h2 className="text-lg font-bold text-brand-navy font-display border-b border-gray-100 pb-3">
                  Tags & Keywords
                </h2>

                <div>
                  <label className="block text-sm font-semibold text-brand-navy mb-1">
                    Add Tags
                  </label>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="e.g. laptop, apple, electronics"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold bg-white"
                    />

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddTag}
                    >
                      Add Tag
                    </Button>
                  </div>

                  <p className="text-xs text-gray-500 mt-1">
                    Up to 10 tags. Press Enter to add quickly.
                  </p>
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-navy/10 text-brand-navy rounded-full text-xs font-semibold"
                      >
                        #{tag}

                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          aria-label={`Remove ${tag}`}
                          className="hover:text-red-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Submission notice */}
              <div className="rounded-2xl border border-brand-gold/30 bg-brand-gold/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-brand-navy mt-0.5 shrink-0" />

                  <div>
                    <p className="text-sm font-semibold text-brand-navy">
                      Before you publish
                    </p>

                    <p className="text-sm text-gray-600 mt-1">
                      {vendorProfile?.is_vip
                        ? "As a VIP vendor, your listing can be published immediately."
                        : "Your listing will be submitted for review and become visible after approval."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    router.push("/dashboard/vendor/listings")
                  }
                  disabled={submitting}
                  className="rounded-2xl"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={
                    submitting ||
                    categoriesLoading ||
                    filteredCategories.length === 0
                  }
                  className="rounded-2xl"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Listing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Create Listing
                    </>
                  )}
                </Button>
              </div>
            </form>
          </StaggerEntrance>
        </div>
      </main>
    </>
  );
}