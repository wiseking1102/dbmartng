import type { MetadataRoute } from "next";

// Base URL — single source of truth
const BASE_URL = "https://dbmart.ng";

// Static routes with their change frequency and priority
const staticRoutes: { path: string; changeFreq: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "", changeFreq: "weekly", priority: 1.0 },
  { path: "/browse", changeFreq: "daily", priority: 0.9 },
  { path: "/pricing", changeFreq: "monthly", priority: 0.8 },
  { path: "/about", changeFreq: "monthly", priority: 0.6 },
  { path: "/careers", changeFreq: "weekly", priority: 0.7 },
  { path: "/auth", changeFreq: "monthly", priority: 0.3 },
  { path: "/onboarding", changeFreq: "monthly", priority: 0.3 },
  { path: "/legal/terms", changeFreq: "monthly", priority: 0.4 },
  { path: "/legal/privacy", changeFreq: "monthly", priority: 0.4 },
  { path: "/legal/ndpr", changeFreq: "monthly", priority: 0.4 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sitemapEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${BASE_URL}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFreq,
    priority: route.priority,
  }));

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const adminClient = createAdminClient();

    const { data: vendors } = await adminClient
      .from("vendor_profiles")
      .select("slug, updated_at")
      .eq("is_verified", true);

    if (vendors) {
      const vendorRoutes = vendors.map((vendor: any) => ({
        url: `${BASE_URL}/vendors/${vendor.slug}`,
        lastModified: new Date(vendor.updated_at || Date.now()),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
      sitemapEntries.push(...vendorRoutes);
    }

    const { data: listings } = await adminClient
      .from("listings")
      .select("slug, updated_at")
      .eq("status", "approved");

    if (listings) {
      const listingRoutes = listings.map((listing: any) => ({
        url: `${BASE_URL}/listings/${listing.slug}`,
        lastModified: new Date(listing.updated_at || Date.now()),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
      sitemapEntries.push(...listingRoutes);
    }
  } catch (err) {
    console.error("Sitemap dynamic generation error:", err);
  }

  return sitemapEntries;
}
