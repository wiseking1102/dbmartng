import type { MetadataRoute } from "next";

const BASE_URL = "https://dbmart.ng";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/browse",
        "/pricing",
        "/about",
        "/careers",
        "/vendors/",
        "/legal/",
      ],
      disallow: [
        "/admin/",
        "/dashboard/",
        "/account/",
        "/api/",
        "/auth/",
        "/onboarding/",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
