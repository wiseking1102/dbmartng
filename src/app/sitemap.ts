import type { MetadataRoute } from "next";

const BASE_URL = "https://dbmart.ng";

// Re-generate the sitemap periodically rather than on every request.
// This keeps the sitemap fresh while avoiding unnecessary database queries.
export const revalidate = 3600;

type SitemapEntry = MetadataRoute.Sitemap[number];

const staticRoutes: SitemapEntry[] = [
  {
    url: BASE_URL,
    changeFrequency: "weekly",
    priority: 1.0,
  },
  {
    url: `${BASE_URL}/browse`,
    changeFrequency: "daily",
    priority: 0.9,
  },
  {
    url: `${BASE_URL}/categories`,
    changeFrequency: "weekly",
    priority: 0.9,
  },
  {
    url: `${BASE_URL}/pricing`,
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    url: `${BASE_URL}/about`,
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    url: `${BASE_URL}/careers`,
    changeFrequency: "weekly",
    priority: 0.7,
  },
  {
    url: `${BASE_URL}/contact`,
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    url: `${BASE_URL}/faq`,
    changeFrequency: "monthly",
    priority: 0.6,
  },

  // Public legal/documentation pages
  {
    url: `${BASE_URL}/legal/terms`,
    changeFrequency: "yearly",
    priority: 0.4,
  },
  {
    url: `${BASE_URL}/legal/privacy`,
    changeFrequency: "yearly",
    priority: 0.4,
  },
  {
    url: `${BASE_URL}/legal/ndpr`,
    changeFrequency: "yearly",
    priority: 0.4,
  },
  {
    url: `${BASE_URL}/legal/data-policy`,
    changeFrequency: "yearly",
    priority: 0.4,
  },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sitemapEntries: MetadataRoute.Sitemap = [...staticRoutes];

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");

    const supabase = createAdminClient();

    /*
     * Fetch all public categories.
     *
     * Category detail pages use:
     * /categories/[slug]
     *
     * Only records that actually exist in the categories table
     * are added, so the sitemap stays synchronized with the database.
     */
    const categoriesPromise = supabase
      .from("categories")
      .select("slug, updated_at")
      .not("slug", "is", null);

    /*
     * Fetch verified vendor profiles.
     *
     * Vendor detail pages use:
     * /vendors/[slug]
     */
    const vendorsPromise = supabase
      .from("vendor_profiles")
      .select("slug, updated_at")
      .eq("is_verified", true)
      .not("slug", "is", null);

    /*
     * Fetch approved listings.
     *
     * Listing detail pages use:
     * /listings/[slug]
     */
    const listingsPromise = supabase
      .from("listings")
      .select("slug, updated_at")
      .eq("status", "approved")
      .not("slug", "is", null);

    const [
      { data: categories, error: categoriesError },
      { data: vendors, error: vendorsError },
      { data: listings, error: listingsError },
    ] = await Promise.all([
      categoriesPromise,
      vendorsPromise,
      listingsPromise,
    ]);

    /*
     * Categories
     */
    if (!categoriesError && categories) {
      const categoryRoutes: SitemapEntry[] = categories
        .filter((category) => category.slug)
        .map((category) => ({
          url: `${BASE_URL}/categories/${encodeURIComponent(
            String(category.slug)
          )}`,
          ...(category.updated_at
            ? { lastModified: new Date(category.updated_at) }
            : {}),
          changeFrequency: "weekly" as const,
          priority: 0.8,
        }));

      sitemapEntries.push(...categoryRoutes);
    } else if (categoriesError) {
      console.error("Sitemap categories query error:", categoriesError);
    }

    /*
     * Verified vendors
     */
    if (!vendorsError && vendors) {
      const vendorRoutes: SitemapEntry[] = vendors
        .filter((vendor) => vendor.slug)
        .map((vendor) => ({
          url: `${BASE_URL}/vendors/${encodeURIComponent(
            String(vendor.slug)
          )}`,
          ...(vendor.updated_at
            ? { lastModified: new Date(vendor.updated_at) }
            : {}),
          changeFrequency: "weekly" as const,
          priority: 0.8,
        }));

      sitemapEntries.push(...vendorRoutes);
    } else if (vendorsError) {
      console.error("Sitemap vendors query error:", vendorsError);
    }

    /*
     * Approved listings
     */
    if (!listingsError && listings) {
      const listingRoutes: SitemapEntry[] = listings
        .filter((listing) => listing.slug)
        .map((listing) => ({
          url: `${BASE_URL}/listings/${encodeURIComponent(
            String(listing.slug)
          )}`,
          ...(listing.updated_at
            ? { lastModified: new Date(listing.updated_at) }
            : {}),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        }));

      sitemapEntries.push(...listingRoutes);
    } else if (listingsError) {
      console.error("Sitemap listings query error:", listingsError);
    }
  } catch (error) {
    /*
     * If Supabase temporarily fails, return the static public
     * sitemap instead of causing /sitemap.xml to fail completely.
     */
    console.error("Sitemap generation error:", error);
  }

  /*
   * Remove accidental duplicate URLs before returning the sitemap.
   */
  const uniqueEntries = Array.from(
    new Map(
      sitemapEntries.map((entry) => [entry.url, entry])
    ).values()
  );

  return uniqueEntries;
}