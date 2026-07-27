import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Grid,
  Store,
  Sparkles,
  Search,
  Filter,
  BadgeCheck,
  Crown,
  MapPin,
} from "lucide-react";
import { formatNaira } from "@/lib/utils";
import { createAdminClient } from "@/lib/supabase/admin";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const adminClient = createAdminClient();
  const { data: category } = await (adminClient
    .from("categories")
    .select("name, description")
    .eq("slug", slug)
    .maybeSingle() as never) as unknown as { data: { name: string; description: string } | null };

  if (!category) {
    return { title: "Category Not Found — DBMartNG" };
  }

  return {
    title: `${category.name} — Verified Nigerian Businesses & Products`,
    description:
      category.description ||
      `Find top verified ${category.name} businesses, products, and services across Nigeria on DBMartNG.`,
    openGraph: {
      title: `${category.name} — DBMartNG`,
      description: category.description || `Browse ${category.name} on DBMartNG.`,
    },
  };
}

export default async function CategoryDetailPage({ params }: Props) {
  const { slug } = await params;
  const adminClient = createAdminClient();

  const { data: category } = await (adminClient
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .maybeSingle() as never) as unknown as { data: any };

  if (!category) {
    notFound();
  }

  // Fetch approved listings in this category
  const { data: rawListings } = await (adminClient
    .from("listings")
    .select(
      `
      *,
      vendor_profiles (
        business_name,
        slug,
        is_verified,
        is_vip,
        city
      )
    `
    )
    .eq("category_id", category.id)
    .eq("status", "approved") as never) as unknown as { data: any[] | null };

  // Fetch vendors in this category
  const { data: rawVendors } = await (adminClient
    .from("vendor_profiles")
    .select("*")
    .eq("category_id", category.id)
    .eq("is_verified", true) as never) as unknown as { data: any[] | null };

  const listings = rawListings || [];
  const vendors = rawVendors || [];

  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen bg-surface-secondary pb-16">
        {/* Category Hero */}
        <section className="bg-gradient-to-b from-brand-navy/10 via-white to-surface-secondary py-12 border-b border-gray-200/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Link
              href="/categories"
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-navy mb-4 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> All Categories
            </Link>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="inline-block px-3 py-1 bg-brand-gold/10 text-brand-gold text-xs font-bold rounded-full uppercase tracking-wider mb-2">
                  {category.type === "goods" ? "Goods Category" : "Service Category"}
                </span>
                <h1 className="text-3xl sm:text-4xl font-bold text-brand-navy font-display">
                  {category.name}
                </h1>
                <p className="text-gray-600 max-w-2xl mt-2">
                  {category.description ||
                    `Discover top verified ${category.name} vendors and product/service listings in Nigeria.`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="glass px-4 py-2 rounded-2xl text-center">
                  <span className="block text-2xl font-bold text-brand-navy">{vendors.length}</span>
                  <span className="text-xs text-gray-500">Vendors</span>
                </div>
                <div className="glass px-4 py-2 rounded-2xl text-center">
                  <span className="block text-2xl font-bold text-brand-navy">{listings.length}</span>
                  <span className="text-xs text-gray-500">Listings</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-12">
          {/* Featured Vendors in Category */}
          {vendors.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-brand-navy font-display mb-4 flex items-center gap-2">
                <Store className="h-5 w-5 text-brand-gold" /> Top Vendors in {category.name}
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {vendors.map((vendor: any) => (
                  <Link
                    key={vendor.id}
                    href={`/vendors/${vendor.slug}`}
                    className="glass rounded-3xl p-6 hover:-translate-y-1 hover:shadow-xl transition-all group border border-white/50"
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-brand-navy/5 shrink-0 border border-gray-100">
                        <Image
                          src={vendor.logo_url || "/brand/logo-flat.png"}
                          alt={vendor.business_name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <h3 className="font-bold text-brand-navy group-hover:text-brand-gold transition-colors">
                            {vendor.business_name}
                          </h3>
                          {vendor.is_vip ? (
                            <Crown className="h-4 w-4 text-brand-gold fill-current" />
                          ) : (
                            <BadgeCheck className="h-4 w-4 text-accent-success" />
                          )}
                        </div>
                        {vendor.city && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" /> {vendor.city}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {vendor.description || "Verified DBMartNG business partner."}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Product & Service Listings */}
          <div>
            <h2 className="text-xl font-bold text-brand-navy font-display mb-4 flex items-center gap-2">
              <Grid className="h-5 w-5 text-brand-gold" /> Listings ({listings.length})
            </h2>

            {listings.length === 0 ? (
              <div className="glass rounded-3xl p-12 text-center">
                <Grid className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-brand-navy mb-1">No listings in this category yet</h3>
                <p className="text-gray-500 max-w-md mx-auto mb-6 text-sm">
                  Be the first vendor to add products or services under {category.name}!
                </p>
                <Link href="/auth?type=vendor">
                  <Button variant="gold">Join as Vendor</Button>
                </Link>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {listings.map((listing: any) => (
                  <Link
                    key={listing.id}
                    href={`/listings/${listing.slug}`}
                    className="glass rounded-3xl overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all group flex flex-col border border-white/50"
                  >
                    <div className="relative aspect-4/3 overflow-hidden bg-gray-100">
                      <Image
                        src={
                          listing.image_urls?.[0] ||
                          "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=60"
                        }
                        alt={listing.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-5 flex flex-col flex-1 justify-between space-y-3">
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">
                          {listing.vendor_profiles?.business_name}
                        </p>
                        <h3 className="font-bold text-brand-navy group-hover:text-brand-gold transition-colors line-clamp-1">
                          {listing.title}
                        </h3>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="font-bold text-brand-navy">
                          {listing.price ? formatNaira(listing.price) : "Contact"}
                        </span>
                        <span className="text-xs text-brand-navy font-semibold hover:underline">
                          View details →
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
