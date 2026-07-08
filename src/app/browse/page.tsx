"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal, MapPin, Star, ChevronDown } from "lucide-react";
import { BreadcrumbListJsonLd } from "@/components/seo/JsonLd";
import { SavedSearchButton } from "@/components/engagement/SavedSearchButton";
import StaggerEntrance from "@/components/animations/StaggerEntrance";

const sampleVendors = [
  {
    id: "1",
    name: "TechZone NG",
    category: "Tech & Electronics",
    rating: 4.8,
    reviews: 124,
    location: "Lagos, Nigeria",
    description: "Premium electronics and gadgets retailer offering the latest tech products.",
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop",
    slug: "techzone-ng",
    isSponsored: true,
    isVerified: true,
  },
  {
    id: "2",
    name: "Lagos Fashion House",
    category: "Fashion & Style",
    rating: 4.9,
    reviews: 89,
    location: "Lagos, Nigeria",
    description: "Contemporary African fashion and bespoke tailoring services.",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop",
    slug: "lagos-fashion-house",
    isSponsored: false,
    isVerified: true,
  },
  {
    id: "3",
    name: "Naija Bites",
    category: "Food & Beverages",
    rating: 4.7,
    reviews: 203,
    location: "Abuja, Nigeria",
    description: "Authentic Nigerian cuisine and catering services for all occasions.",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop",
    slug: "naija-bites",
    isSponsored: false,
    isVerified: true,
  },
  {
    id: "4",
    name: "Glam Studios",
    category: "Makeup & Beauty",
    rating: 4.6,
    reviews: 67,
    location: "Port Harcourt, Nigeria",
    description: "Professional makeup artistry and beauty consulting services.",
    image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=300&fit=crop",
    slug: "glam-studios",
    isSponsored: false,
    isVerified: false,
  },
  {
    id: "5",
    name: "Lens & Light Photography",
    category: "Photography",
    rating: 4.9,
    reviews: 156,
    location: "Asaba, Nigeria",
    description: "Professional photography and videography for events and commercial use.",
    image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=300&fit=crop",
    slug: "lens-light-photography",
    isSponsored: false,
    isVerified: true,
  },
  {
    id: "6",
    name: "Elegance Tailoring",
    category: "Tailoring & Sewing",
    rating: 4.5,
    reviews: 92,
    location: "Delta, Nigeria",
    description: "Custom tailoring and native wear designs for men and women.",
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop",
    slug: "elegance-tailoring",
    isSponsored: false,
    isVerified: false,
  },
];

export default function BrowsePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  return (
    <>
      {/* JSON-LD Structured Data */}
      <BreadcrumbListJsonLd
        items={[
          { name: "Home", url: "https://dbmart.ng" },
          { name: "Browse Vendors", url: "https://dbmart.ng/browse" },
        ]}
      />
      <Header />
      <main className="pt-20">
        {/* Hero Search */}
        <section className="bg-gradient-to-r from-brand-navy to-brand-navy-dark py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-white font-display mb-2">
              Browse Vendors
            </h1>
            <p className="text-gray-300 mb-6">
              Discover verified businesses across Nigeria
            </p>
            <div className="max-w-2xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search vendors, products, or services..."
                  className="w-full h-12 pl-12 pr-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                />
              </div>
              <div className="mt-4">
                <SavedSearchButton
                  query={searchQuery}
                  filters={{
                    category: selectedCategory !== "all" ? selectedCategory : "",
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Filters and Results */}
        <section className="py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Category Pills */}
            <StaggerEntrance>
            <div className="flex flex-wrap gap-2 mb-8">
              {["all", "fashion", "food", "tech", "makeup", "photography", "tailoring", "events", "repair"].map(
                (cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedCategory === cat
                        ? "bg-brand-navy text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                )
              )}
            </div>

            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-gray-500">
                Showing <span className="font-semibold text-brand-navy">{sampleVendors.length}</span> vendors
              </p>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-navy"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                <ChevronDown className={`h-3 w-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
              </button>
            </div>

            {/* Vendor Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sampleVendors.map((vendor) => (
                <Link
                  key={vendor.id}
                  href={`/vendors/${vendor.slug}`}
                  className="group glass rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
                >
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src={vendor.image}
                      alt={vendor.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 flex gap-2">
                      {vendor.isSponsored && (
                        <span className="bg-brand-gold text-brand-navy text-xs font-bold px-2 py-1 rounded-full">
                          Sponsored
                        </span>
                      )}
                      {vendor.isVerified && (
                        <span className="bg-accent-success text-white text-xs font-bold px-2 py-1 rounded-full">
                          Verified
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="text-xs text-brand-slate font-medium uppercase tracking-wider mb-1">
                      {vendor.category}
                    </div>
                    <h3 className="text-lg font-bold text-brand-navy mb-2 group-hover:text-brand-gold transition-colors">
                      {vendor.name}
                    </h3>
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                      {vendor.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-sm text-gray-500">
                        <MapPin className="h-3.5 w-3.5" />
                        {vendor.location}
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 text-brand-gold fill-current" />
                        <span className="font-semibold text-brand-navy">{vendor.rating}</span>
                        <span className="text-gray-400">({vendor.reviews})</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            </StaggerEntrance>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
