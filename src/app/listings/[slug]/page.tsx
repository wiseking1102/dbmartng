import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import {
  Store,
  MapPin,
  Phone,
  MessageSquare,
  BadgeCheck,
  Crown,
  Share2,
  Clock,
  Tag,
  ArrowLeft,
  Eye,
  Calendar,
  Sparkles,
} from "lucide-react";
import { formatNaira } from "@/lib/utils";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProductJsonLd, BreadcrumbListJsonLd } from "@/components/seo/JsonLd";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const adminClient = createAdminClient();
  const { data: listing } = await (adminClient
    .from("listings")
    .select("title, description, image_urls, vendor_profiles(business_name)")
    .eq("slug", slug)
    .maybeSingle() as never) as unknown as { data: { title: string; description: string; image_urls: string[]; vendor_profiles: { business_name: string } } | null };

  if (!listing) {
    return { title: "Listing Not Found — DBMartNG" };
  }

  return {
    title: `${listing.title} — ${listing.vendor_profiles?.business_name || "DBMartNG"}`,
    description: listing.description || `View ${listing.title} on DBMartNG.`,
    openGraph: {
      title: `${listing.title} — DBMartNG`,
      description: listing.description || `View ${listing.title} on DBMartNG.`,
      images: listing.image_urls?.[0] ? [{ url: listing.image_urls[0] }] : [],
    },
  };
}

export default async function ListingDetailPage({ params }: Props) {
  const { slug } = await params;
  const adminClient = createAdminClient();

  const { data: rawListing } = await (adminClient
    .from("listings")
    .select(
      `
      *,
      vendor_profiles (
        id,
        business_name,
        slug,
        logo_url,
        phone,
        whatsapp_number,
        is_verified,
        is_vip,
        city,
        state,
        average_response_time,
        store_hours
      ),
      categories (
        name,
        slug
      )
    `
    )
    .eq("slug", slug)
    .maybeSingle() as never) as unknown as { data: any };

  if (!rawListing) {
    notFound();
  }

  const listing = rawListing;
  const vendor = listing.vendor_profiles;

  // Increment view count asynchronously
  try {
    await (adminClient
      .from("listings")
      .update({ view_count: (listing.view_count || 0) + 1 } as never)
      .eq("id", listing.id) as never);
  } catch (err) {
    // Non-blocking view increment
  }

  const defaultImage = "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=60";
  const mainImage = listing.image_urls?.[0] || defaultImage;

  // Compute live open status
  const getOpenStatus = () => {
    if (!vendor?.store_hours) return null;
    const now = new Date();
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const today = days[now.getDay()];
    const todayHours = vendor.store_hours[today];
    if (!todayHours || todayHours.closed) return { open: false, text: "Closed today" };
    return { open: true, text: `Open today: ${todayHours.open || "9:00 AM"} – ${todayHours.close || "6:00 PM"}` };
  };
  const openStatus = getOpenStatus();

  const waMessage = encodeURIComponent(
    `Hello ${vendor?.business_name || "Vendor"}, I saw your listing "${listing.title}" on DBMartNG and would like to inquire about it!`
  );
  const waUrl = vendor?.whatsapp_number
    ? `https://wa.me/${vendor.whatsapp_number.replace(/[^0-9]/g, "")}?text=${waMessage}`
    : null;

  return (
    <>
      <ProductJsonLd
        name={listing.title}
        description={listing.description || ""}
        image={mainImage}
        price={listing.price ? Number(listing.price) : 0}
        priceCurrency="NGN"
        url={`https://dbmart.ng/listings/${listing.slug}`}
      />
      <BreadcrumbListJsonLd
        items={[
          { name: "Home", url: "https://dbmart.ng" },
          { name: "Browse", url: "https://dbmart.ng/browse" },
          {
            name: listing.categories?.name || "Category",
            url: `https://dbmart.ng/categories/${listing.categories?.slug || "all"}`,
          },
          { name: listing.title, url: `https://dbmart.ng/listings/${listing.slug}` },
        ]}
      />

      <Header />
      <main className="pt-20 min-h-screen bg-surface-secondary pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
          {/* Breadcrumb / Back link */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <Link href="/browse" className="hover:text-brand-navy flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> Back to Browse
            </Link>
            <span>/</span>
            {listing.categories && (
              <>
                <Link
                  href={`/categories/${listing.categories.slug}`}
                  className="hover:text-brand-navy"
                >
                  {listing.categories.name}
                </Link>
                <span>/</span>
              </>
            )}
            <span className="text-gray-900 font-medium truncate max-w-xs">{listing.title}</span>
          </div>

          <div className="grid lg:grid-cols-12 gap-8">
            {/* Left 7 Cols: Image & Description */}
            <div className="lg:col-span-7 space-y-6">
              {/* Main Image */}
              <div className="relative aspect-4/3 rounded-3xl overflow-hidden glass border border-white/40 shadow-xl">
                <Image
                  src={mainImage}
                  alt={listing.title}
                  fill
                  className="object-cover"
                  priority
                />
                {listing.is_service && (
                  <span className="absolute top-4 left-4 bg-brand-navy text-white text-xs font-bold px-3 py-1.5 rounded-full shadow">
                    Service Listing
                  </span>
                )}
                {listing.is_featured && (
                  <span className="absolute top-4 right-4 bg-brand-gold text-brand-navy text-xs font-bold px-3 py-1.5 rounded-full shadow flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 fill-current" /> Featured
                  </span>
                )}
              </div>

              {/* Gallery thumbnails if available */}
              {listing.image_urls && listing.image_urls.length > 1 && (
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                  {listing.image_urls.map((img: string, i: number) => (
                    <div
                      key={i}
                      className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-gray-200"
                    >
                      <Image src={img} alt={`Thumbnail ${i}`} fill className="object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {/* Details & Description Card */}
              <div className="glass rounded-3xl p-6 sm:p-8 space-y-6">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy font-display mb-3">
                    {listing.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Eye className="h-4 w-4" /> {listing.view_count || 0} views
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />{" "}
                      Listed {new Date(listing.created_at).toLocaleDateString("en-NG")}
                    </span>
                  </div>
                </div>

                <div className="border-t border-b border-gray-100 py-4">
                  <div className="text-3xl font-bold text-brand-navy">
                    {listing.price ? formatNaira(listing.price) : "Contact for Pricing"}
                    {listing.price_period && listing.price_period !== "one_time" && (
                      <span className="text-sm text-gray-500 font-normal ml-1">
                        /{listing.price_period}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-bold text-brand-navy mb-2">Description</h2>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                    {listing.description || "No description provided."}
                  </p>
                </div>

                {/* Tags */}
                {listing.tags && listing.tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-1">
                      <Tag className="h-4 w-4" /> Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {listing.tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-brand-navy/5 text-brand-navy rounded-full text-xs font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right 5 Cols: Vendor Info & Contact Actions */}
            <div className="lg:col-span-5 space-y-6">
              <div className="glass rounded-3xl p-6 sm:p-8 space-y-6 sticky top-24 border border-white/40 shadow-xl">
                {/* Vendor Card Header */}
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-brand-navy/5 shrink-0 border border-gray-200">
                    <Image
                      src={vendor?.logo_url || "/brand/logo-flat.png"}
                      alt={vendor?.business_name || "Vendor Logo"}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <Link
                      href={`/vendors/${vendor?.slug || ""}`}
                      className="group flex items-center gap-1.5"
                    >
                      <h3 className="font-bold text-lg text-brand-navy group-hover:text-brand-gold transition-colors">
                        {vendor?.business_name || "Vendor"}
                      </h3>
                      {vendor?.is_vip ? (
                        <span title="VIP Vendor">
                          <Crown className="h-4 w-4 text-brand-gold fill-current" />
                        </span>
                      ) : vendor?.is_verified ? (
                        <span title="Verified Vendor">
                          <BadgeCheck className="h-4 w-4 text-accent-success" />
                        </span>
                      ) : null}
                    </Link>
                    {(vendor?.city || vendor?.state) && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3.5 w-3.5 text-gray-400" />
                        {[vendor.city, vendor.state].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Seller Signal Badges */}
                <div className="space-y-2.5 text-xs text-gray-600 bg-surface-secondary p-4 rounded-2xl">
                  {openStatus && (
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          openStatus.open ? "bg-accent-success" : "bg-gray-400"
                        }`}
                      />
                      <span className="font-medium">{openStatus.text}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-brand-gold" />
                    <span>
                      Usually replies within{" "}
                      {vendor?.average_response_time
                        ? `${vendor.average_response_time} minutes`
                        : "2 hours"}
                    </span>
                  </div>
                </div>

                {/* Contact CTA Buttons */}
                <div className="space-y-3 pt-2">
                  {waUrl && (
                    <a href={waUrl} target="_blank" rel="noopener noreferrer" className="block">
                      <Button variant="gold" size="lg" className="w-full">
                        <MessageSquare className="h-5 w-5" />
                        Chat on WhatsApp
                      </Button>
                    </a>
                  )}

                  {vendor?.phone && (
                    <a href={`tel:${vendor.phone}`} className="block">
                      <Button variant="outline" size="lg" className="w-full border-brand-navy text-brand-navy">
                        <Phone className="h-5 w-5" />
                        Call {vendor.phone}
                      </Button>
                    </a>
                  )}

                  <Link href={`/vendors/${vendor?.slug || ""}`} className="block">
                    <Button variant="ghost" size="lg" className="w-full">
                      <Store className="h-5 w-5" />
                      View Vendor Profile
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
