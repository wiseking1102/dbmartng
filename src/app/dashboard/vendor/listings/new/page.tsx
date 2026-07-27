"use client";

import { useState, useEffect } from "react";
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
  Package,
  Upload,
  Plus,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  Tag,
} from "lucide-react";

export default function NewListingPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [categories, setCategories] = useState<any[]>([]);
  const [vendorProfile, setVendorProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [pricePeriod, setPricePeriod] = useState("one_time");
  const [categoryId, setCategoryId] = useState("");
  const [isService, setIsService] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && (!user || (role !== "vendor" && role !== "admin" && role !== "sub_admin"))) {
      router.push("/auth?type=vendor");
    }
  }, [user, role, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);

      // Get vendor profile
      const { data: profile } = await supabase
        .from("vendor_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile) setVendorProfile(profile);

      // Get categories
      const { data: cats } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (cats) setCategories(cats);
      setLoading(false);
    };

    fetchData();
  }, [user, supabase]);

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleAddImageUrl = () => {
    if (imageUrl.trim() && imageUrl.startsWith("http")) {
      setImageUrls([...imageUrls, imageUrl.trim()]);
      setImageUrl("");
    } else {
      toast.error("Please enter a valid Image URL (http:// or https://)");
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title is required");
    if (!description.trim()) return toast.error("Description is required");
    if (!categoryId) return toast.error("Please select a category");

    setSubmitting(true);
    try {
      if (!vendorProfile) {
        throw new Error("Vendor profile not found. Please complete onboarding first.");
      }

      // Check text moderation endpoint before submitting
      const modRes = await fetch("/api/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `${title} ${description}` }),
      });
      if (modRes.ok) {
        const modData = await modRes.json();
        if (modData.flagged) {
          throw new Error(`Content flagged for policy violation: ${modData.reason || "Inappropriate text"}`);
        }
      }

      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "") + "-" + Math.floor(Math.random() * 1000);

      // VIP vendors publish directly to approved status, others go to pending_review
      const initialStatus = vendorProfile.is_vip ? "approved" : "pending_review";

      const { data: newListing, error: insertError } = await (supabase
        .from("listings")
        .insert({
          vendor_id: vendorProfile.id,
          title: title.trim(),
          slug,
          description: description.trim(),
          price: price ? parseFloat(price) : null,
          price_period: pricePeriod,
          category_id: categoryId,
          is_service: isService,
          tags,
          image_urls: imageUrls.length > 0 ? imageUrls : ["https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=60"],
          status: initialStatus,
        } as never)
        .select()
        .single() as never) as unknown as { data: any; error: any };

      if (insertError) throw insertError;

      if (vendorProfile.is_vip) {
        toast.success("Listing published live immediately (VIP Privilege)!");
      } else {
        toast.success("Listing submitted for review! It will be live once approved.");
      }

      router.push("/dashboard/vendor/listings");
    } catch (err: any) {
      toast.error(err.message || "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
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
      <main className="pt-20 min-h-screen bg-surface-secondary pb-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
          <StaggerEntrance>
            <div className="flex items-center gap-3 mb-8">
              <Link
                href="/dashboard/vendor/listings"
                className="text-gray-400 hover:text-brand-navy"
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
              {/* Basic Info */}
              <div className="glass rounded-3xl p-6 sm:p-8 space-y-5">
                <h2 className="text-lg font-bold text-brand-navy font-display border-b border-gray-100 pb-3">
                  Basic Details
                </h2>

                <div>
                  <label className="block text-sm font-semibold text-brand-navy mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MacBook Pro 14-inch M3 or Bridal Makeup Package"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold bg-white"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-brand-navy mb-1">
                      Category *
                    </label>
                    <select
                      required
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold bg-white"
                    >
                      <option value="">Select a category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name} ({cat.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-brand-navy mb-1">
                      Type
                    </label>
                    <div className="flex gap-4 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                        <input
                          type="radio"
                          name="isService"
                          checked={!isService}
                          onChange={() => setIsService(false)}
                          className="accent-brand-navy"
                        />
                        Physical Product
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                        <input
                          type="radio"
                          name="isService"
                          checked={isService}
                          onChange={() => setIsService(true)}
                          className="accent-brand-navy"
                        />
                        Service
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-brand-navy mb-1">
                    Description *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Provide a detailed description of your product or service..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold bg-white"
                  />
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
                      step="0.01"
                      placeholder="e.g. 50000 (Leave blank for 'Contact for Price')"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold bg-white"
                    />
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
                    Image URL (Cloudflare R2 / Unsplash)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://..."
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold bg-white"
                    />
                    <Button type="button" variant="outline" onClick={handleAddImageUrl}>
                      <Plus className="h-4 w-4" /> Add
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter direct image web links. Defaults to stock fallback if left empty.
                  </p>
                </div>

                {imageUrls.length > 0 && (
                  <div className="flex flex-wrap gap-3 pt-2">
                    {imageUrls.map((url, i) => (
                      <div
                        key={i}
                        className="relative w-24 h-24 rounded-2xl overflow-hidden border border-gray-200 group"
                      >
                        <img src={url} alt={`Preview ${i}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(i)}
                          className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full text-xs opacity-80 hover:opacity-100"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
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
                  <div className="flex gap-2">
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
                    <Button type="button" variant="outline" onClick={handleAddTag}>
                      Add Tag
                    </Button>
                  </div>
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-brand-navy/10 text-brand-navy rounded-full text-xs font-semibold"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-red-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Action */}
              <div className="flex items-center justify-end gap-4 pt-4">
                <Link href="/dashboard/vendor/listings">
                  <Button type="button" variant="ghost">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" variant="gold" size="lg" loading={submitting}>
                  <Package className="h-5 w-5" /> Submit Listing
                </Button>
              </div>
            </form>
          </StaggerEntrance>
        </div>
      </main>
    </>
  );
}
