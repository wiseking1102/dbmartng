import type { MetadataRoute } from "next";

const BASE_URL = "https://dbmart.ng";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",

      // DBMartNG is a public marketplace.
      // Allow search engines to crawl all public pages by default.
      allow: ["/"],

      // Keep private, authenticated, administrative,
      // transactional and application-only routes out of crawling.
      disallow: [
        "/admin",
        "/admin/",

        "/dashboard",
        "/dashboard/",

        "/account",
        "/account/",

        "/api",
        "/api/",

        "/auth",
        "/auth/",

        "/onboarding",
        "/onboarding/",

        "/payment",
        "/payment/",

        "/offline",
        "/offline/",

        "/referral",
        "/referral/",
      ],
    },

    // Tell every compliant search engine exactly where
    // DBMartNG's XML sitemap is located.
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}