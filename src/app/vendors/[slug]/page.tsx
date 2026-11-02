import { notFound } from "next/navigation";
import Image from "next/image";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Star,
  Phone,
  Mail,
  Globe,
  MessageSquare,
  Send,
  Store,
  Shield,
  ExternalLink,
} from "lucide-react";
import { whatsappDeepLink } from "@/lib/utils";
import { LocalBusinessJsonLd } from "@/components/seo/JsonLd";
import { VendorProfileAnimations } from "@/components/animations/VendorProfileAnimations";
import StaggerEntrance from "@/components/animations/StaggerEntrance";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import VendorInteractive, {
  type VendorInteractiveVendor,
} from "@/components/vendor/VendorInteractive";

/*
 * DBMartNG vendor profile.
 *
 * Fully server-rendered from live Supabase data:
 * - vendor profile row ( Vendor profiles ), joined category name
 * - that vendor's active listings from  listings
 * - aggregate rating + latest reviews from  reviews , with buyer
 *   display names joined from  users
 *
 * Every query failure degrades that section gracefully instead of
 * breaking the whole profile.
 */

type VendorRow = {
  id: string;
  slug: string;
  business_name: string;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  gallery_urls: string[];
  is_verified: boolean;
  phone: string | null;
  email: string | null;
  whatsapp_number: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  social_links: unknown;
  categories: { name: string } | null;
};

type ListingRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price: number | null;
  price_period: string | null;
  image_urls: string[];
  is_service: boolean;
  is_featured: boolean;
};

type ReviewRow = {
  id: string;
  rating: number;
  body: string | null;
  vendor_reply: string | null;
  created_at: string;
  buyer: { full_name: string | null } | null;
};

function formatListingPrice(listing: ListingRow): string {
  if (listing.price == null) {
    return "Contact for pricing";
  }

  const formatted = `₦${listing.price.toLocaleString("en-NG")}`;

  if (listing.price_period) {
    return `${formatted} / ${listing.price_period}`;
  }

  return formatted;
}

function formatStreetLocation(vendor: VendorRow): string {
  const cityState = [vendor.city, vendor.state]
    .filter(Boolean)
    .join(", ");

  return cityState || "Nigeria";
}

function initialsFrom(name: string): string {
  const words = name.trim().split(/\s+/).slice(0, 2);

  return (
    words.map((word) => word.charAt(0).toUpperCase()).join("") ||
    "DB"
  );
}

function timeAgo(dateString: string): string {
  const then = new Date(dateString).getTime();
  const now = Date.now();
  const days = Math.floor((now - then) / 86_400_000);

  if (days <= 0) {
    return "Today";
  }

  if (days === 1) {
    return "1 day ago";
  }

  if (days < 30) {
    return `${days} days ago`;
  }

  const months = Math.floor(days / 30);

  if (months === 1) {
    return "1 month ago";
  }

  if (months < 12) {
    return `${months} months ago`;
  }

  const years = Math.floor(months / 12);

  return years === 1 ? "1 year ago" : `${years} years ago`;
}

const descriptiveSocialKeys = [
  "instagram",
  "twitter",
  "x",
  "facebook",
  "linkedin",
  "tiktok",
  "youtube",
] as const;

function describeSocialLinks(socialLinks: unknown): string[] {
  if (!socialLinks || typeof socialLinks !== "object") {
    return [];
  }

  const entries = Object.entries(
    socialLinks as Record<string, unknown>
  );

  const described: string[] = [];

  for (const [key, value] of entries) {
    if (
      typeof value === "string" &&
      (descriptiveSocialKeys as readonly string[]).includes(key)
    ) {
      described.push(`${key}: ${value}`);
    }
  }

  return described;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    const supabase = await createServerSupabaseClient();

    const { data } = await supabase
      .from("vendor_profiles")
      .select("business_name, description, city, state")
      .eq("slug", slug)
      .maybeSingle();

    const vendor = data as unknown as
      | Pick<
          VendorRow,
          "business_name" | "description" | "city" | "state"
        >
      | null;

    if (!vendor) {
      return { title: "Vendor not found | DBMartNG" };
    }

    const location = [vendor.city, vendor.state]
      .filter(Boolean)
      .join(", ");

    return {
      title: `${vendor.business_name} | DBMartNG`,
      description:
        vendor.description ||
        `View ${vendor.business_name}${
          location ? ` in ${location}` : ""
        } on DBMartNG — contact directly on WhatsApp or through their profile.`,
      openGraph: {
        title: `${vendor.business_name} | DBMartNG`,
        description:
          vendor.description ||
          `Discover ${vendor.business_name} on DBMartNG.`,
        type: "profile",
      },
    };
  } catch {
    return { title: "Vendor profile | DBMartNG" };
  }
}

export default async function VendorProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  /*
   * ------------------------------------------------------------
   * Vendor row
   * ------------------------------------------------------------
   */
  const { data: vendorData } = await supabase
    .from("vendor_profiles")
    .select(
      `id, slug, business_name, description, logo_url, cover_image_url,
       gallery_urls, is_verified, phone, email, whatsapp_number,
       website, city, state, social_links,
       categories ( name )`
    )
    .eq("slug", slug)
    .maybeSingle();

  const vendor = vendorData as unknown as VendorRow | null;

  if (!vendor) {
    notFound();
  }

  /*
   * ------------------------------------------------------------
   * Listings — only active items count as live products
   * ------------------------------------------------------------
   */
  const { data: listingData } = await supabase
    .from("listings")
    .select(
      `id, slug, title, description, price, price_period,
       image_urls, is_service, is_featured`
    )
    .eq("vendor_id", vendor.id)
    .eq("status", "active")
    .order("is_featured", { ascending: false })
    .order("is_promoted", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(12);

  const listings =
    (listingData as unknown as ListingRow[] | null) || [];

  /*
   * ------------------------------------------------------------
   * Reviews + aggregate rating
   * ------------------------------------------------------------
   */
  const { data: reviewData } = await supabase
    .from("reviews")
    .select(
      `id, rating, body, vendor_reply, created_at,
       buyer:users ( full_name )`
    )
    .eq("vendor_id", vendor.id)
    .order("created_at", { ascending: false })
    .limit(8);

  const reviews =
    (reviewData as unknown as ReviewRow[] | null) || [];

  const { data: ratingData } = await supabase
    .from("reviews")
    .select("rating")
    .eq("vendor_id", vendor.id)
    .limit(500);

  const ratings =
    (ratingData as unknown as { rating: number }[] | null) || [];

  const reviewCount = ratings.length;
  const averageRating =
    reviewCount > 0
      ? Math.round(
          (ratings.reduce(
            (sum, r) => sum + (r.rating || 0),
            0
          ) /
            reviewCount) *
            10
        ) / 10
      : 0;

  const socialDescriptions = describeSocialLinks(
    vendor.social_links
  );

  const galleryImages = Array.isArray(vendor.gallery_urls)
    ? vendor.gallery_urls.filter(
        (url) => typeof url === "string" && url.length > 0
      )
    : [];

  const interactiveVendor: VendorInteractiveVendor = {
    id: vendor.id,
    name: vendor.business_name,
    slug: vendor.slug,
  };

  return (
    <>
      {/* JSON-LD Structured Data */}
      <LocalBusinessJsonLd
        name={vendor.business_name}
        description={
          vendor.description ||
          `${vendor.business_name} on DBMartNG.`
        }
        url={`https://dbmart.ng/vendors/${vendor.slug}`}
        image={vendor.logo_url || undefined}
        telephone={vendor.phone || undefined}
        email={vendor.email || undefined}
        address={formatStreetLocation(vendor)}
        priceRange="₦₦"
        aggregateRating={
          reviewCount > 0
            ? {
                ratingValue: averageRating,
                reviewCount,
              }
            : undefined
        }
      />

      <VendorProfileAnimations>
        <Header />

        <main className="pt-16">
          <StaggerEntrance>
            {/* Cover Image */}
            <div className="vendor-cover relative h-48 sm:h-64 lg:h-80 overflow-hidden bg-gradient-to-r from-brand-navy to-brand-slate">
              {vendor.cover_image_url && (
                <Image
                  src={vendor.cover_image_url}
                  alt=""
                  fill
                  className="object-cover"
                  priority
                />
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </div>

            {/* Vendor Info Bar */}
            <div className="relative -mt-20 z-10">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="vendor-info-card glass-strong rounded-2xl p-6 sm:p-8">
                  <div className="flex flex-col sm:flex-row items-start gap-6">
                    {/* Logo */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 border-4 border-white shadow-lg bg-brand-navy flex items-center justify-center">
                      {vendor.logo_url ? (
                        <Image
                          src={vendor.logo_url}
                          alt={vendor.business_name}
                          width={96}
                          height={96}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl font-bold text-white font-display">
                          {initialsFrom(vendor.business_name)}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy font-display">
                          {vendor.business_name}
                        </h1>

                        {vendor.is_verified && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent-success/10 text-accent-success text-xs font-semibold">
                            <Shield className="h-3.5 w-3.5" />
                            Verified
                          </span>
                        )}

                        {reviewCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-gold/10 text-brand-gold text-xs font-semibold">
                            <Star className="h-3.5 w-3.5 fill-current" />
                            {averageRating} ({reviewCount})
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
                        {vendor.categories?.name && (
                          <span className="text-brand-slate font-medium uppercase tracking-wider">
                            {vendor.categories.name}
                          </span>
                        )}

                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {formatStreetLocation(vendor)}
                        </span>
                      </div>

                      {vendor.description && (
                        <p className="text-gray-600 leading-relaxed">
                          {vendor.description}
                        </p>
                      )}
                    </div>

                    {/* Contact Buttons */}
                    <div className="flex flex-wrap gap-3 sm:flex-col w-full sm:w-auto">
                      {vendor.whatsapp_number && (
                        <a
                          href={whatsappDeepLink(
                            vendor.whatsapp_number,
                            `Hi ${vendor.business_name}, I saw your profile on DBMartNG and I'm interested in your products/services.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            variant="gold"
                            size="md"
                            className="w-full sm:w-auto"
                          >
                            <MessageSquare className="h-4 w-4" />
                            WhatsApp
                          </Button>
                        </a>
                      )}

                      <a href="#message-form">
                        <Button
                          variant="primary"
                          size="md"
                          className="w-full sm:w-auto"
                        >
                          <Send className="h-4 w-4" />
                          Message
                        </Button>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="py-12">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-3 gap-8">
                  {/* Main - Listings */}
                  <div className="lg:col-span-2 space-y-8">
                    {galleryImages.length > 0 && (
                      <div className="gallery-section">
                        <h2 className="text-xl font-bold text-brand-navy mb-4">
                          Gallery
                        </h2>

                        <div className="grid grid-cols-3 gap-3">
                          {galleryImages
                            .slice(0, 6)
                            .map((img, i) => (
                              <div
                                key={`${img}-${i}`}
                                className="gallery-item relative aspect-square rounded-xl overflow-hidden"
                              >
                                <Image
                                  src={img}
                                  alt={`${vendor.business_name} gallery image ${i + 1}`}
                                  fill
                                  className="object-cover hover:scale-105 transition-transform duration-300"
                                  sizes="(max-width: 640px) 30vw, 20vw"
                                />
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Listings */}
                    <div className="listings-section">
                      <h2 className="text-xl font-bold text-brand-navy mb-4">
                        Products & Services
                      </h2>

                      {listings.length === 0 ? (
                        <div className="glass rounded-xl p-8 text-center">
                          <Store className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                          <p className="text-gray-500 text-sm">
                            This vendor has no active listings
                            yet. Check back soon.
                          </p>
                        </div>
                      ) : (
                        <div className="grid sm:grid-cols-2 gap-4">
                          {listings.map((listing) => (
                            <a
                              key={listing.id}
                              href={`/listings/${listing.slug}`}
                              className="listing-card glass rounded-xl overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-300 block"
                            >
                              <div className="relative h-40 overflow-hidden bg-gray-100">
                                {listing.image_urls?.[0] ? (
                                  <Image
                                    src={listing.image_urls[0]}
                                    alt={listing.title}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 640px) 100vw, 320px"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Store className="h-8 w-8 text-gray-300" />
                                  </div>
                                )}
                              </div>

                              <div className="p-4">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <h3 className="font-semibold text-brand-navy">
                                    {listing.title}
                                  </h3>

                                  {listing.is_featured && (
                                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-brand-gold">
                                      Featured
                                    </span>
                                  )}
                                </div>

                                {listing.description && (
                                  <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                                    {listing.description}
                                  </p>
                                )}

                                <p className="text-lg font-bold text-brand-gold">
                                  {formatListingPrice(listing)}
                                </p>
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Reviews */}
                    <div className="reviews-section">
                      <h2 className="text-xl font-bold text-brand-navy mb-4">
                        Reviews ({reviewCount})
                      </h2>

                      {reviews.length === 0 ? (
                        <div className="glass rounded-xl p-6 text-center">
                          <p className="text-gray-500 text-sm">
                            No reviews yet.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {reviews.map((review) => (
                            <div
                              key={review.id}
                              className="review-item glass rounded-xl p-5"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-brand-navy">
                                  {review.buyer?.full_name ||
                                    "Verified buyer"}
                                </span>

                                <span className="text-sm text-gray-400">
                                  {timeAgo(review.created_at)}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 mb-2">
                                {Array.from({ length: 5 }).map(
                                  (_, j) => (
                                    <Star
                                      key={j}
                                      className={`h-4 w-4 ${
                                        j < review.rating
                                          ? "text-brand-gold fill-current"
                                          : "text-gray-200"
                                      }`}
                                    />
                                  )
                                )}
                              </div>

                              {review.body && (
                                <p className="text-gray-600 text-sm">
                                  {review.body}
                                </p>
                              )}

                              {review.vendor_reply && (
                                <div className="mt-3 pl-3 border-l-2 border-brand-gold/40">
                                  <p className="text-xs font-semibold text-brand-navy mb-1">
                                    Vendor reply
                                  </p>
                                  <p className="text-gray-600 text-sm">
                                    {review.vendor_reply}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sidebar */}
                  <div className="vendor-sidebar space-y-6">
                    {/* Contact Card */}
                    <div className="glass rounded-2xl p-6">
                      <h3 className="font-bold text-brand-navy mb-4">
                        Contact Info
                      </h3>

                      <div className="space-y-3">
                        {vendor.phone && (
                          <a
                            href={`tel:${vendor.phone}`}
                            className="flex items-center gap-3 text-sm text-gray-600 hover:text-brand-navy"
                          >
                            <Phone className="h-4 w-4 text-brand-gold" />
                            {vendor.phone}
                          </a>
                        )}

                        {vendor.email && (
                          <a
                            href={`mailto:${vendor.email}`}
                            className="flex items-center gap-3 text-sm text-gray-600 hover:text-brand-navy"
                          >
                            <Mail className="h-4 w-4 text-brand-gold" />
                            {vendor.email}
                          </a>
                        )}

                        {vendor.website && (
                          <a
                            href={vendor.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 text-sm text-gray-600 hover:text-brand-navy"
                          >
                            <Globe className="h-4 w-4 text-brand-gold" />
                            {vendor.website.replace(
                              /^https?:\/\//,
                              ""
                            )}
                            <ExternalLink className="h-3 w-3 ml-auto" />
                          </a>
                        )}

                        {vendor.whatsapp_number && (
                          <a
                            href={whatsappDeepLink(
                              vendor.whatsapp_number,
                              `Hi ${vendor.business_name}, I saw your profile on DBMartNG!`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 text-sm text-gray-600 hover:text-brand-navy"
                          >
                            <MessageSquare className="h-4 w-4 text-brand-gold" />
                            WhatsApp
                          </a>
                        )}

                        {socialDescriptions.map((link) => (
                          <p
                            key={link}
                            className="flex items-center gap-3 text-sm text-gray-600"
                          >
                            <Globe className="h-4 w-4 text-brand-gold" />
                            {link}
                          </p>
                        ))}
                      </div>
                    </div>

                    {/* Interactive island: message form, QR, share */}
                    <VendorInteractive
                      vendor={interactiveVendor}
                    />
                  </div>
                </div>
              </div>
            </div>
          </StaggerEntrance>
        </main>

        <Footer />
      </VendorProfileAnimations>
    </>
  );
}


