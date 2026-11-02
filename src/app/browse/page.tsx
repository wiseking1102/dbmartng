import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Search, SlidersHorizontal, MapPin, Star, ChevronLeft, ChevronRight, Store } from "lucide-react";
import { BreadcrumbListJsonLd } from "@/components/seo/JsonLd";
import { SavedSearchButton } from "@/components/engagement/SavedSearchButton";
import StaggerEntrance from "@/components/animations/StaggerEntrance";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * DBMartNG vendor directory.
 *
 * Server-rendered from live Supabase data with URL-driven
 * search (?q=), category filtering (?category=slug) and
 * pagination (?page=). Works fully without client JS.
 */

const PAGE_SIZE = 18;

type VendorCardRow = {
  id: string;
  slug: string;
  business_name: string;
  description: string | null;
  cover_image_url: string | null;
  logo_url: string | null;
  is_verified: boolean;
  is_sponsored: boolean;
  city: string | null;
  state: string | null;
  categories: { name: string } | null;
};

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
};

function buildBrowseHref(params: {
  q?: string;
  category?: string;
  page?: number;
}): string {
  const search = new URLSearchParams();

  if (params.q) {
    search.set("q", params.q);
  }

  if (params.category) {
    search.set("category", params.category);
  }

  if (params.page && params.page > 1) {
    search.set("page", String(params.page));
  }

  const query = search.toString();

  return query ? `/browse?${query}` : "/browse";
}

function initialsFrom(name: string): string {
  const words = name.trim().split(/\s+/).slice(0, 2);

  return (
    words.map((word) => word.charAt(0).toUpperCase()).join("") ||
    "DB"
  );
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await searchParams;

  const q =
    typeof resolvedParams.q === "string"
      ? resolvedParams.q.trim().slice(0, 80)
      : "";

  const categorySlug =
    typeof resolvedParams.category === "string"
      ? resolvedParams.category.trim().slice(0, 80)
      : "";

  const page =
    typeof resolvedParams.page === "string"
      ? Math.max(1, parseInt(resolvedParams.page, 10) || 1)
      : 1;

  const supabase = await createServerSupabaseClient();

  /*
   * ------------------------------------------------------------
   * Active categories for the filter pills
   * ------------------------------------------------------------
   */
  const { data: categoryData } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const categories =
    (categoryData as unknown as CategoryRow[] | null) || [];

  const selectedCategory = categories.find(
    (category) => category.slug === categorySlug
  );

  /*
   * ------------------------------------------------------------
   * Vendor query
   * ------------------------------------------------------------
   * Expired / cancelled subscriptions are not discoverable in
   * the directory. All other vendors (active, trial, pending)
   * remain visible.
   */
  let vendorQuery = supabase
    .from("vendor_profiles")
    .select(
      `id, slug, business_name, description, cover_image_url,
       logo_url, is_verified, is_sponsored, city, state,
       categories ( name )`,
      { count: "exact" }
    )
    .neq("subscription_status", "expired")
    .neq("subscription_status", "cancelled");

  if (q) {
    const escaped = q.replace(/[,()%]/g, "");

    vendorQuery = vendorQuery.or(
      [
        `business_name.ilike.%${escaped}%`,
        `description.ilike.%${escaped}%`,
        `city.ilike.%${escaped}%`,
        `state.ilike.%${escaped}%`,
      ].join(",")
    );
  }

  if (selectedCategory) {
    vendorQuery = vendorQuery.eq(
      "category_id",
      selectedCategory.id
    );
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: vendorRows, count } = await vendorQuery
    .order("is_sponsored", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  const vendors =
    (vendorRows as unknown as VendorCardRow[] | null) || [];

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /*
   * ------------------------------------------------------------
   * Aggregate review ratings for the visible vendors
   * ------------------------------------------------------------
   */
  const vendorIds = vendors.map((vendor) => vendor.id);

  let ratingByVendor = new Map<
    string,
    { rating: number; reviews: number }
  >();

  if (vendorIds.length > 0) {
    const { data: ratingRows } = await supabase
      .from("reviews")
      .select("vendor_id, rating")
      .in("vendor_id", vendorIds)
      .limit(2000);

    const ratings =
      (ratingRows as unknown as
        | { vendor_id: string; rating: number }[]
        | null) || [];

    const sums = new Map<
      string,
      { total: number; count: number }
    >();

    for (const review of ratings) {
      const bucket = sums.get(review.vendor_id) || {
        total: 0,
        count: 0,
      };

      bucket.total += review.rating || 0;
      bucket.count += 1;

      sums.set(review.vendor_id, bucket);
    }

    ratingByVendor = new Map(
      Array.from(sums.entries()).map(
        ([vendorId, bucket]) => [
          vendorId,
          {
            rating:
              Math.round(
                (bucket.total / bucket.count) * 10
              ) / 10,
            reviews: bucket.count,
          },
        ]
      )
    );
  }

  const resultsLabel = total === 1 ? "vendor" : "vendors";

  return (
    <>
      {/* JSON-LD Structured Data */}
      <BreadcrumbListJsonLd
        items={[
          { name: "Home", url: "https://dbmart.ng" },
          { name: "Browse Vendors", url: "https://dbmart.ng/browse" },
        ]}
      />
      <Header />
      <main className="pt-20">
        {/* Hero Search */}
        <section className="bg-gradient-to-r from-brand-navy to-brand-navy-dark py-16 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'repeat',
              backgroundSize: '256px 256px',
            }}
          />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="badge-gold inline-flex mb-4 border-white/20 text-brand-gold">
              <Search className="h-3.5 w-3.5" />
              Discover
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white font-display mb-2 leading-tight">
              Browse <span className="text-brand-gold">Vendors</span>
            </h1>
            <p className="text-gray-300 mb-6 max-w-xl">
              Discover verified businesses across Nigeria
            </p>
            <div className="max-w-2xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 z-10 text-gray-400" />
                <form action="/browse" method="get">
                  {categorySlug && (
                    <input type="hidden" name="category" value={categorySlug} />
                  )}
                  <input
                    type="text"
                    name="q"
                    defaultValue={q}
                    placeholder="Search vendors, products, or services..."
                    className="w-full h-12 pl-12 pr-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                  />
                </form>
              </div>
              <div className="mt-4">
                <SavedSearchButton
                  query={q}
                  filters={{
                    category: selectedCategory?.slug ?? "",
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Filters and Results */}
        <section className="py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Category Pills */}
            <StaggerEntrance>
            <div className="flex flex-wrap gap-2 mb-8">
              <Link
                href={buildBrowseHref({ q })}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  !categorySlug
                    ? "bg-brand-navy text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All
              </Link>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={buildBrowseHref({ q, category: category.slug })}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    categorySlug === category.slug
                      ? "bg-brand-navy text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {category.name}
                </Link>
              ))}
            </div>

            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-gray-500">
                Showing <span className="font-semibold text-brand-navy">{vendors.length}</span> of{" "}
                <span className="font-semibold text-brand-navy">{total}</span> {resultsLabel}
              </p>
              <span className="flex items-center gap-2 text-sm text-gray-500">
                <SlidersHorizontal className="h-4 w-4" />
                {page}/{totalPages}
              </span>
            </div>

            {/* Vendor Grid */}
            {vendors.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <Store className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-bold text-brand-navy mb-2">
                  No vendors found
                </h3>
                <p className="text-gray-500 text-sm mb-6">
                  {q
                    ? `Nothing matches "${q}" right now. Try a different search.`
                    : "No vendors are listed in this category yet. Check back soon."}
                </p>
                <Link
                  href="/browse"
                  className="text-sm font-semibold text-brand-gold hover:underline"
                >
                  Clear filters
                </Link>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {vendors.map((vendor) => {
                  const rating = ratingByVendor.get(vendor.id);

                  return (
                    <Link
                      key={vendor.id}
                      href={`/vendors/${vendor.slug}`}
                      className="group glass rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
                    >
                      <div className="relative h-48 overflow-hidden bg-gradient-to-r from-brand-navy to-brand-slate flex items-center justify-center">
                        {vendor.cover_image_url || vendor.logo_url ? (
                          <Image
                            src={
                              (vendor.cover_image_url ||
                                vendor.logo_url) as string
                            }
                            alt={vendor.business_name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                          />
                        ) : (
                          <span className="text-3xl font-bold text-white/80 font-display">
                            {initialsFrom(vendor.business_name)}
                          </span>
                        )}
                        <div className="absolute top-3 left-3 flex gap-2">
                          {vendor.is_sponsored && (
                            <span className="bg-brand-gold text-brand-navy text-xs font-bold px-2 py-1 rounded-full">
                              Sponsored
                            </span>
                          )}
                          {vendor.is_verified && (
                            <span className="bg-accent-success text-white text-xs font-bold px-2 py-1 rounded-full">
                              Verified
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="p-5">
                        <div className="text-xs text-brand-slate font-medium uppercase tracking-wider mb-1">
                          {vendor.categories?.name ?? "Independent vendor"}
                        </div>
                        <h3 className="text-lg font-bold text-brand-navy mb-2 group-hover:text-brand-gold transition-colors">
                          {vendor.business_name}
                        </h3>
                        <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                          {vendor.description || "Vendor on DBMartNG."}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-sm text-gray-500">
                            <MapPin className="h-3.5 w-3.5" />
                            {[vendor.city, vendor.state]
                              .filter(Boolean)
                              .join(", ") || "Nigeria"}
                          </div>
                          {rating && (
                            <div className="flex items-center gap-1 text-sm">
                              <Star className="h-4 w-4 text-brand-gold fill-current" />
                              <span className="font-semibold text-brand-navy">
                                {rating.rating}
                              </span>
                              <span className="text-gray-400">
                                ({rating.reviews})
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && vendors.length > 0 && (
              <div className="flex items-center justify-center gap-3 mt-10">
                {page > 1 && (
                  <Link
                    href={buildBrowseHref({
                      q,
                      category: selectedCategory?.slug,
                      page: page - 1,
                    })}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Link>
                )}

                <span className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </span>

                {page < totalPages && (
                  <Link
                    href={buildBrowseHref({
                      q,
                      category: selectedCategory?.slug,
                      page: page + 1,
                    })}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            )}
            </StaggerEntrance>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
