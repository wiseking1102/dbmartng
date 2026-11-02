import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { HeroAnimations } from "@/components/animations/HeroAnimations";
import HeroSection from "@/components/home/HeroSection";
import {
  Store,
  Shield,
  TrendingUp,
  ArrowRight,
  Star,
  Sparkles,
  Zap,
  MapPin,
  MessageCircle,
  CheckCircle,
  Search,
} from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * DBMartNG homepage - server-rendered with live Supabase data.
 * Honest platform stats, real categories with real vendor counts,
 * and real featured vendors. No fabricated numbers.
 */

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
};

type VendorRow = {
  id: string;
  slug: string;
  business_name: string;
  cover_image_url: string | null;
  logo_url: string | null;
  is_sponsored: boolean;
  city: string | null;
  state: string | null;
  categories: { name: string } | null;
};

const howItWorks = [
  { step: "01", title: "Discover", desc: "Browse verified vendors and their products or services by category or search.", icon: Search },
  { step: "02", title: "Connect", desc: "Message vendors directly, call them, or reach out on WhatsApp with one tap.", icon: MessageCircle },
  { step: "03", title: "Trust", desc: "Verified profiles, real reviews from real buyers, and responsive support.", icon: Shield },
];

function initialsFrom(name: string): string {
  const words = name.trim().split(/\s+/).slice(0, 2);

  return (
    words.map((word) => word.charAt(0).toUpperCase()).join("") ||
    "DB"
  );
}

export const revalidate = 300;

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();

  const { data: categoryData } = await supabase
    .from("categories")
    .select("id, name, slug, icon")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const categoryRows =
    (categoryData as unknown as CategoryRow[] | null) || [];

  const { data: membershipData } = await supabase
    .from("vendor_profiles")
    .select("category_id")
    .neq("subscription_status", "expired")
    .neq("subscription_status", "cancelled")
    .limit(10000);

  const memberships =
    (membershipData as unknown as
      | { category_id: string | null }[]
      | null) || [];

  const vendorCountByCategory = new Map<string, number>();
  let activeVendorCount = 0;

  for (const membership of memberships) {
    activeVendorCount += 1;

    if (membership.category_id) {
      vendorCountByCategory.set(
        membership.category_id,
        (vendorCountByCategory.get(membership.category_id) || 0) + 1
      );
    }
  }

  const categories = categoryRows
    .slice(0, 8)
    .map((category) => ({
      name: category.name,
      slug: category.slug,
      image: category.icon || "\u{1F3F7}\uFE0F",
      count: vendorCountByCategory.get(category.id) || 0,
    }));

  const [listingResult, verifiedResult] = await Promise.all([
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("vendor_profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_verified", true)
      .neq("subscription_status", "expired")
      .neq("subscription_status", "cancelled"),
  ]);

  const listingCount = listingResult.count ?? 0;
  const verifiedCount = verifiedResult.count ?? 0;

  const { data: ratingData } = await supabase
    .from("reviews")
    .select("rating")
    .limit(1000);

  const ratingRows =
    (ratingData as unknown as { rating: number }[] | null) || [];

  const averageRating =
    ratingRows.length > 0
      ? Math.round(
          (ratingRows.reduce((sum, r) => sum + (r.rating || 0), 0) /
            ratingRows.length) *
            10
        ) / 10
      : 0;

  const stats = [
    {
      value: `${activeVendorCount.toLocaleString("en-NG")}+`,
      label: "Vendors Listed",
      icon: Store,
    },
    {
      value: `${listingCount.toLocaleString("en-NG")}+`,
      label: "Products & Services",
      icon: TrendingUp,
    },
    {
      value: `${verifiedCount}`,
      label: "Verified Vendors",
      icon: Shield,
    },
    {
      value: averageRating > 0 ? `${averageRating}\u2605` : "\u2014",
      label: "Avg. Vendor Rating",
      icon: Star,
    },
  ];

  const { data: featuredData } = await supabase
    .from("vendor_profiles")
    .select(
      `id, slug, business_name, cover_image_url, logo_url,
       is_sponsored, city, state, categories ( name )`
    )
    .neq("subscription_status", "expired")
    .neq("subscription_status", "cancelled")
    .order("is_sponsored", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(6);

  const featuredRows =
    (featuredData as unknown as VendorRow[] | null) || [];

  const featuredIds = featuredRows.map((vendor) => vendor.id);

  const ratingByVendor = new Map<
    string,
    { rating: number; reviews: number }
  >();

  if (featuredIds.length > 0) {
    const { data: featuredRatings } = await supabase
      .from("reviews")
      .select("vendor_id, rating")
      .in("vendor_id", featuredIds)
      .limit(1000);

    const rows =
      (featuredRatings as unknown as
        | { vendor_id: string; rating: number }[]
        | null) || [];

    const sums = new Map<
      string,
      { total: number; count: number }
    >();

    for (const row of rows) {
      const bucket = sums.get(row.vendor_id) || {
        total: 0,
        count: 0,
      };

      bucket.total += row.rating || 0;
      bucket.count += 1;

      sums.set(row.vendor_id, bucket);
    }

    for (const [vendorId, bucket] of sums.entries()) {
      ratingByVendor.set(vendorId, {
        rating:
          Math.round((bucket.total / bucket.count) * 10) / 10,
        reviews: bucket.count,
      });
    }
  }

  const featuredVendors = featuredRows
    .sort((a, b) => {
      const aHasImage = Boolean(
        a.cover_image_url || a.logo_url
      );
      const bHasImage = Boolean(
        b.cover_image_url || b.logo_url
      );

      return Number(bHasImage) - Number(aHasImage);
    })
    .slice(0, 3);

  return (
    <>
      <Header />
      <HeroAnimations>
        <main>
          <HeroSection />

          <section className="stats-section relative -mt-16 z-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="glass-strong rounded-2xl p-8 grid grid-cols-2 md:grid-cols-4 gap-8 shadow-2xl">
                {stats.map((stat) => (
                  <div key={stat.label} className="stat-item text-center group">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-gold/10 to-brand-gold/5 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                      <stat.icon className="h-6 w-6 text-brand-gold" />
                    </div>
                    <div className="stat-value text-2xl sm:text-3xl font-bold text-brand-navy font-display">
                      {stat.value}
                    </div>
                    <div className="text-sm text-brand-slate-dark mt-1">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="categories-section py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-14">
                <div>
                  <div className="badge-gold mb-4 inline-flex">
                    <Sparkles className="h-3.5 w-3.5" />
                    Browse by Category
                  </div>
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-brand-navy font-display leading-tight">
                    Find What You&apos;re
                    <br />
                    <span className="gradient-text">Looking For</span>
                  </h2>
                </div>
                <p className="text-lg text-gray-500 max-w-md leading-relaxed">
                  From fashion and food to tech and professional services - discover verified businesses across every industry.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {categories.map((cat, index) => (
                  <Link
                    key={cat.slug}
                    href={`/browse?category=${cat.slug}`}
                    className={`bento-card p-6 sm:p-8 text-center group ${
                      index === 0 ? "sm:col-span-2 sm:row-span-2" : ""
                    }`}
                  >
                    <div className={`h-full flex flex-col items-center justify-center ${index === 0 ? "gap-4" : "gap-3"}`}>
                      <span className={`${index === 0 ? "text-6xl" : "text-4xl"} block transition-transform duration-500 group-hover:scale-110`}>
                        {cat.image}
                      </span>
                      <div>
                        <h3 className={`font-bold text-brand-navy group-hover:text-brand-gold transition-colors ${index === 0 ? "text-2xl" : "text-base"}`}>
                          {cat.name}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1 font-medium">{cat.count} vendors</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section className="featured-section py-24 bg-surface-secondary">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-14">
                <div>
                  <div className="badge-success mb-4 inline-flex">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Featured Vendors
                  </div>
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-brand-navy font-display leading-tight">
                    Top-Rated Businesses
                    <br />
                    <span className="gradient-text">on DBMartNG</span>
                  </h2>
                </div>
                <Link
                  href="/browse"
                  className="group hidden sm:flex items-center gap-2 text-brand-navy font-semibold hover:text-brand-gold transition-colors"
                >
                  View All Vendors
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>

              {featuredVendors.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                  <Store className="mx-auto h-12 w-12 text-gray-300 mb

          <section className="how-it-works-section py-24 relative overflow-hidden">
            <div className="absolute inset-0 bg-brand-navy opacity-95" />
            <div className="absolute inset-0 mesh-navy" />

            <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <div className="badge-gold inline-flex mb-4 text-brand-gold border-brand-gold/20">
                  <Zap className="h-3.5 w-3.5" />
                  Simple Process
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display text-white leading-tight mb-4">
                  How DBMartNG <span className="text-brand-gold">Works</span>
                </h2>
                <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
                  Whether you&apos;re looking for a product or listing your
                  business, we make it simple in three steps.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
                {howItWorks.map((item) => (
                  <div key={item.step} className="how-it-works-step text-center group">
                    <div className="relative mb-8">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-gold/10 to-brand-gold/5 border border-brand-gold/20 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-500 group-hover:shadow-lg group-hover:shadow-brand-gold/20">
                        <item.icon className="h-9 w-9 text-brand-gold" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-brand-gold text-brand-navy text-sm font-bold flex items-center justify-center">
                        {item.step}
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                    <p className="text-gray-400 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="cta-section py-24 relative overflow-hidden">
            <div className="absolute inset-0 mesh-gold" />
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
              <div className="badge-gold inline-flex mb-4">
                <Sparkles className="h-3.5 w-3.5" />
                Get Started Today
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-brand-navy font-display leading-tight mb-4">
                Ready to Grow Your Business?
              </h2>
              <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                Join Nigerian businesses on DBMartNG. Get discovered by
                customers near you. Start with a 30-day free trial - no card
                required.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link href="/auth?type=vendor">
                  <Button variant="gold" size="xl" className="shadow-xl shadow-brand-gold/20 hover:shadow-2xl hover:shadow-brand-gold/30 transition-all duration-300">
                    List Your Business Free
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button variant="outline" size="xl" className="border-brand-navy/30 text-brand-navy hover:bg-brand-navy hover:text-white">
                    View Pricing
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        </main>
      </HeroAnimations>
      <Footer />
    </>
  );
}
