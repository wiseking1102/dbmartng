"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { HeroAnimations } from "@/components/animations/HeroAnimations";
import {
  Search,
  Store,
  Users,
  Shield,
  TrendingUp,
  ArrowRight,
  Star,
  Sparkles,
  Zap,
  MapPin,
  MessageCircle,
  CheckCircle,
} from "lucide-react";



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

const howItWorks = [
  { step: "01", title: "Discover", desc: "Browse verified vendors and their products or services by category or search.", icon: Search },
  { step: "02", title: "Connect", desc: "Message vendors directly, call them, or reach out on WhatsApp with one tap.", icon: MessageCircle },
  { step: "03", title: "Trust", desc: "Verified profiles, real reviews from real buyers, and responsive support.", icon: Shield },
];

export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);

  return (
    <>
      <Header />
      <HeroAnimations>
      <main>
        {/* ─── HERO SECTION WITH VIDEO BACKGROUND ─── */}
        <section
          ref={heroRef}
          className="relative min-h-screen flex items-center overflow-hidden"
        >
          {/* Video Background */}
          <div className="absolute inset-0 w-full h-full">
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              onLoadedData={() => setVideoLoaded(true)}
              className={`video-background transition-opacity duration-1000 ${
                videoLoaded ? "opacity-100" : "opacity-0"
              }`}
              poster="/brand/logo-3d.png"
            >
              <source src="/hero-bg.mp4" type="video/mp4" />
            </video>
            {/* Gradient Overlay */}
            <div className="hero-overlay" />
            {/* Noise Texture */}
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                backgroundRepeat: "repeat",
                backgroundSize: "256px 256px",
              }}
            />
            {/* Subtle animated orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full bg-brand-gold/10 blur-3xl animate-drift"
                  style={{
                    width: `${100 + Math.random() * 200}px`,
                    height: `${100 + Math.random() * 200}px`,
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${i * 1.2}s`,
                    animationDuration: `${8 + Math.random() * 6}s`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-32 lg:py-40 w-full">
            <div className="max-w-3xl">
              {/* Badge */}
              <div className="hero-badge inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-gold opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-gold" />
                </span>
                <span className="text-sm font-medium text-brand-gold">
                  Nigeria&apos;s Trusted Business Directory
                </span>
              </div>

              {/* Headline */}
              <h1 className="hero-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold font-display text-white leading-[1.05] mb-6 tracking-tight">
                Discover & Connect with{" "}
                <span className="gradient-text">Nigerian Businesses</span>
              </h1>

              {/* Description */}
              <p className="hero-description text-lg sm:text-xl text-gray-300/90 mb-10 max-w-xl leading-relaxed">
                Find verified vendors, browse products and services, and
                connect directly with businesses near you — all in one place.
              </p>

              {/* Search */}
              <div className="hero-search max-w-2xl mb-10">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-brand-gold/30 to-brand-navy/30 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
                  <div className="relative">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search for businesses, products, or services..."
                      className="w-full h-14 pl-14 pr-5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent text-lg transition-all duration-300"
                    />
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="hero-cta flex flex-wrap gap-4">
                <Link href="/browse">
                  <Button
                    variant="gold"
                    size="lg"
                    className="group relative overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      Browse Vendors
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-gold via-brand-gold-light to-brand-gold opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </Button>
                </Link>
                <Link href="/auth?type=vendor">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm"
                  >
                    List Your Business
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce z-10">
            <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-1.5 backdrop-blur-sm bg-white/5">
              <div className="w-1.5 h-3 rounded-full bg-white/60 animate-pulse-soft" />
            </div>
          </div>
        </section>

        {/* ─── STATS SECTION ─── */}
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

        {/* ─── CATEGORIES - BENTO GRID ─── */}
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
                From fashion and food to tech and professional services — discover verified businesses across every industry.
              </p>
            </div>

            {/* Bento Grid */}
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

        {/* ─── FEATURED VENDORS ─── */}
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

            <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
              {featuredVendors.map((vendor) => (
                <Link
                  key={vendor.slug}
                  href={`/vendors/${vendor.slug}`}
                  className="featured-card bento-card group overflow-hidden"
                >
                  <div className="relative h-56 overflow-hidden">
                    <Image
                      src={vendor.image}
                      alt={vendor.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    <div className="absolute top-4 right-4 badge-gold text-xs">Sponsored</div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-brand-gold uppercase tracking-wider">{vendor.category}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      <span className="text-xs text-gray-400 flex items-center gap-1"><MapPin className="h-3 w-3" />Nigeria</span>
                    </div>
                    <h3 className="text-xl font-bold text-brand-navy mb-3 group-hover:text-brand-gold transition-colors">{vendor.name}</h3>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-brand-gold fill-current" />
                        <span className="font-bold text-brand-navy">{vendor.rating}</span>
                      </div>
                      <span className="text-sm text-gray-400">({vendor.reviews} reviews)</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-8 text-center sm:hidden">
              <Link href="/browse">
                <Button variant="outline" size="lg" className="w-full">
                  View All Vendors
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ─── HOW IT WORKS ─── */}
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

        {/* ─── CTA ─── */}
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
              Join 500+ Nigerian businesses on DBMartNG. Get discovered by
              customers near you. Start with a 30-day free trial — no card
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