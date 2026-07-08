/**
 * JSON-LD Structured Data components for DBMartNG SEO.
 *
 * Usage:
 *   import { OrganizationJsonLd, LocalBusinessJsonLd, ... } from "@/components/seo/JsonLd";
 *
 * Add the relevant component inside the <body> of your page/layout.
 * These are server-compatible — no "use client" needed since they don't
 * use React hooks, event handlers, or browser APIs.
 */

export function OrganizationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "DBMartNG",
    url: "https://dbmart.ng",
    logo: "https://dbmart.ng/brand/logo-3d.png",
    description:
      "Nigeria's premier business directory and marketplace platform connecting buyers with verified vendors.",
    foundingDate: "2024",
    founder: [
      {
        "@type": "Person",
        name: "Brume Godgift",
      },
      {
        "@type": "Person",
        name: "Gold Dylan",
      },
    ],
    address: {
      "@type": "PostalAddress",
      addressCountry: "NG",
    },
    sameAs: [],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function LocalBusinessJsonLd({
  name,
  description,
  url,
  image,
  telephone,
  email,
  address,
  priceRange,
  aggregateRating,
  openingHours,
}: {
  name: string;
  description: string;
  url: string;
  image?: string;
  telephone?: string;
  email?: string;
  address?: string;
  priceRange?: string;
  aggregateRating?: { ratingValue: number; reviewCount: number };
  openingHours?: Record<string, { open: string; close: string }>;
}) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name,
    description,
    url,
    image: image || "https://dbmart.ng/brand/logo-3d.png",
    "@id": url,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };

  if (telephone) schema.telephone = telephone;
  if (email) schema.email = email;
  if (address) schema.address = { "@type": "PostalAddress", streetAddress: address };

  if (aggregateRating) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: aggregateRating.ratingValue,
      reviewCount: aggregateRating.reviewCount,
    };
  }

  if (openingHours) {
    const hoursSpecification = Object.entries(openingHours).map(
      ([day, times]) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: day.charAt(0).toUpperCase() + day.slice(1),
        opens: times.open,
        closes: times.close,
      })
    );
    schema.openingHoursSpecification = hoursSpecification;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function ProductJsonLd({
  name,
  description,
  url,
  image,
  price,
  priceCurrency = "NGN",
  category,
}: {
  name: string;
  description: string;
  url: string;
  image?: string;
  price?: number;
  priceCurrency?: string;
  category?: string;
}) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    url,
    "@id": url,
    category,
  };

  if (image) schema.image = image;

  if (price !== undefined) {
    schema.offers = {
      "@type": "Offer",
      price,
      priceCurrency,
      availability: "https://schema.org/InStock",
      url,
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function BreadcrumbListJsonLd({
  items,
}: {
  items: { name: string; url: string }[];
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function FAQPageJsonLd({
  questions,
}: {
  questions: { question: string; answer: string }[];
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: q.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
