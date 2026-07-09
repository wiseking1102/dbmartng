"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { HeroAnimations } from "@/components/animations/HeroAnimations";
import { Search, Store, Users, Shield, TrendingUp, ArrowRight, Star } from "lucide-react";

const Scene3D = dynamic(
  () => import("@/components/hero/Scene3D").then((mod) => ({ default: mod.Scene3D })),
  {
    ssr: false,
    loading: () => (
      <div className="relative w-80 h-80 sm:w-96 sm:h-96 animate-float">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/20 to-brand-navy/20 rounded-full blur-3xl" />
        <Image
          src="/brand/logo-3d.png"
          alt="DBMartNG 3D Logo"
          width={400}
          height={400}
          className="relative z-10 w-full h-full object-contain drop-shadow-2xl"
          priority
        />
      </div>
    ),
  }
);

const categories = [
  { name: "Fashion & Style", slug: "fashion", count: 45, image: "👗" },
  { name: "Food & Beverages", slug: "food", count: 62, image: "🍕" },
  { name: "Tech & Electronics", slug: "tech", count: 38, image: "💻" },
  { name: "Makeup & Beauty", slug: "makeup", count: 29, image: "💄" },
  { name: "Photography", slug: "photography", count: 24, image: "📸" },
  { name: "Tailoring & Sewing", slug: "tailoring", count: 33, image: "🧵" },
  { name: "Event Planning", slug: "events", count: 27, image: "🎉" },
  { name: "Home & Auto Repair", slug: "repair", count: 19, image: "🔧" },
];

const featuredVendors = [
  {
    name: "TechZone NG",
    category: "Tech & Electronics",
    rating: 4.8,
    reviews: 124,
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop",
    slug: "techzone-ng",
  },
  {
    name: "Lagos Fashion House",
    category: "Fashion & Style",
    rating: 4.9,
    reviews: 89,
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop",
    slug: "lagos-fashion-house",
  },
  {
    name: "Naija Bites",
    category: "Food & Beverages",
    rating: 4.7,
    reviews: 203,
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop",
    slug: "naija-bites",
  },
];

const stats = [
  { value: "500+", label: "Vendors Listed", icon: Store },
  { value: "2,000+", label: "Products & Services", icon: TrendingUp },
  { value: "10,000+", label: "Monthly Visitors", icon: Users },
  { value: "4.8★", label: "Avg. Vendor Rating", icon: Star },
];

export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null); // ✅ MOVED INSIDE COMPONENT

  return (
    <>
      <Header />
      <HeroAnimations>
      <main>
        <section
          ref={heroRef}
          className="relative min-h-[90vh] flex items-center bg-gradient-to-br from-brand-navy via-brand-navy-dark to-[#041c3d] overflow-hidden"
        >
          <div className="absolute inset-0 opacity-[0.03]">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 25% 25%, rgba(201, 176, 55, 0.3) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(201, 176, 55, 0.2) 0%, transparent 50%)",
              }}
            />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="text-center lg:text-left">
                <div className="hero-badge inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-gold/10 border border-brand-gold/20 mb-6">
                  <span className="h-2 w-2 rounded-full bg-brand-gold animate-pulse-soft" />
                  <span className="text-sm font-medium text-brand-gold">
                    Nigeria&apos;s Trusted Business Directory
                  </span>
                </div>

                <h1 className="hero-headline text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold font-display text-white leading-tight mb-6">
                  Discover & Connect with{" "}
                  <span className="gradient-text">Nigerian Businesses</span>
                </h1>

                <p className="hero-description text-lg sm:text-xl text-gray-300 mb-8 max-w-xl mx-auto lg:mx-0">
                  Find verified vendors, browse products and services, and
                  connect directly with businesses near you — all in one place.
                </p>

                <div className="hero-search max-w-2xl mx-auto lg:mx-0 mb-8">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search for businesses, products, or services..."
                      className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent text-lg"
                    />
                  </div>
                </div>

                <div className="hero-cta flex flex-wrap gap-4 justify-center lg:justify-start">
                  <Link href="/browse">
                    <Button variant="gold" size="lg">
                      Browse Vendors
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/auth?type=vendor">
                    <Button
                      variant="outline"
                      size="lg"
                      className="border-white/30 text-white hover:bg-white hover:text-brand-navy"
                    >
                      List Your Business
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="hidden lg:flex items-center justify-center">
                <Scene3D />
              </div>
            </div>
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-1">
              <div className="w-1.5 h-3 rounded-full bg-white/60 animate-pulse-soft" />
            </div>
          </div>
        </section>

        <section className="stats-section relative -mt-16 z-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="glass-strong rounded-2xl p-8 grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat) => (
                <div key={stat.label} className="stat-item text-center">
                  <stat.icon className="h-6 w-6 text-brand-gold mx-auto mb-2" />
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

        <section className="categories-section py-20 bg-surface-secondary">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-brand-navy font-display mb-4">
                Browse by Category
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Find exactly what you need — from fashion and food to tech and
                professional services.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/browse?category=${cat.slug}`}
                  className="category-card group glass rounded-2xl p-6 text-center hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
                >
                  <span className="text-4xl block mb-3">{cat.image}</span>
                  <h3 className="font-semibold text-brand-navy group-hover:text-brand-gold transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {cat.count} vendors
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="featured-section py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-12">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold text-brand-navy font-display mb-4">
                  Featured Vendors
                </h2>
                <p className="text-lg text-gray-600">
                  Top-rated businesses on DBMartNG
                </p>
              </div>
              <Link
                href="/browse"
                className="hidden sm:flex items-center gap-2 text-brand-navy font-semibold hover:text-brand-gold transition-colors"
              >
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {featuredVendors.map((vendor) => (
                <Link
                  key={vendor.slug}
                  href={`/vendors/${vendor.slug}`}
                  className="featured-card group glass rounded-2xl overflow-hidden hover:-translate-y-2 hover:shadow-2xl transition-all duration-300"
                >
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src={vendor.image}
                      alt={vendor.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 right-3 bg-brand-gold text-brand-navy text-xs font-bold px-2 py-1 rounded-full">
                      Sponsored
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="text-xs text-brand-slate font-medium uppercase tracking-wider mb-1">
                      {vendor.category}
                    </div>
                    <h3 className="text-xl font-bold text-brand-navy mb-2">
                      {vendor.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex items-center gap-1 text-brand-gold">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="font-semibold">{vendor.rating}</span>
                      </div>
                      <span className="text-gray-400">
                        ({vendor.reviews} reviews)
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="how-it-works-section py-20 bg-brand-navy text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold font-display mb-4">
                How DBMartNG Works
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                Whether you&apos;re looking for a product or listing your
                business, we make it simple.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  title: "Discover",
                  desc: "Browse verified vendors and their products/services by category or search.",
                  icon: Search,
                },
                {
                  step: "02",
                  title: "Connect",
                  desc: "Message vendors directly, call them, or reach out on WhatsApp with one tap.",
                  icon: Users,
                },
                {
                  step: "03",
                  title: "Trust",
                  desc: "Verified profiles, real reviews from real buyers, and responsive support.",
                  icon: Shield,
                },
              ].map((item) => (
                <div key={item.step} className="how-it-works-step text-center group">
                  <div className="w-16 h-16 rounded-2xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center mx-auto mb-6 group-hover:bg-brand-gold/20 transition-colors">
                    <item.icon className="h-7 w-7 text-brand-gold" />
                  </div>
                  <div className="text-sm text-brand-gold font-semibold mb-2">
                    Step {item.step}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-gray-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="cta-section py-20 bg-gradient-to-br from-brand-gold/10 to-brand-navy/5">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-brand-navy font-display mb-4">
              Ready to Grow Your Business?
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Join 500+ Nigerian businesses on DBMartNG. Get discovered by
              customers near you. Start with a 30-day free trial — no card
              required.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/auth?type=vendor">
                <Button variant="gold" size="xl">
                  List Your Business Free
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" size="xl" className="border-brand-navy text-brand-navy hover:bg-brand-navy hover:text-white">
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