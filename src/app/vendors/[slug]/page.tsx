"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
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
  Share2,
  QrCode,
  Clock,
  Shield,
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
  Send,
  ExternalLink,
} from "lucide-react";
import { whatsappDeepLink } from "@/lib/utils";
import { LocalBusinessJsonLd } from "@/components/seo/JsonLd";
import { VendorProfileAnimations } from "@/components/animations/VendorProfileAnimations";
import StaggerEntrance from "@/components/animations/StaggerEntrance";

// Sample data — will be replaced with Supabase queries
const vendor = {
  name: "TechZone NG",
  slug: "techzone-ng",
  category: "Tech & Electronics",
  description:
    "Premium electronics and gadgets retailer offering the latest tech products at competitive prices. We stock smartphones, laptops, accessories, and smart home devices from leading brands.",
  rating: 4.8,
  reviews: 124,
  location: "Ikeja, Lagos, Nigeria",
  phone: "080 1234 5678",
  email: "hello@techzone-ng.com",
  website: "https://techzone-ng.com",
  whatsapp: "2348012345678",
  isVerified: true,
  isOpen: true,
  responseTime: "~2 hours",
  coverImage:
    "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=400&fit=crop",
  logo: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&h=200&fit=crop",
  socialLinks: {
    instagram: "@techzone_ng",
    twitter: "@techzone_ng",
  },
  gallery: [
    "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=600&h=400&fit=crop",
  ],
};

const listings = [
  {
    title: "MacBook Pro 14-inch",
    price: "₦1,850,000",
    description: "Latest M3 chip, 16GB RAM, 512GB SSD",
    image:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop",
  },
  {
    title: "iPhone 15 Pro Max",
    price: "₦1,450,000",
    description: "256GB, Titanium finish, A17 Pro chip",
    image:
      "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=300&fit=crop",
  },
  {
    title: "Sony WH-1000XM5",
    price: "₦350,000",
    description: "Industry-leading noise cancellation",
    image:
      "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&h=300&fit=crop",
  },
  {
    title: "Samsung 65\" OLED TV",
    price: "₦1,200,000",
    description: "4K Smart TV, Dolby Atmos",
    image:
      "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&h=300&fit=crop",
  },
];

const reviews = [
  {
    name: "Chioma O.",
    rating: 5,
    date: "2 weeks ago",
    text: "Excellent service! Got my MacBook within 24 hours. Will definitely buy from TechZone again.",
  },
  {
    name: "Emeka N.",
    rating: 4,
    date: "1 month ago",
    text: "Great prices and genuine products. The staff was very helpful in helping me choose the right laptop.",
  },
  {
    name: "Aisha B.",
    rating: 5,
    date: "2 months ago",
    text: "Fast delivery and authentic products. Highly recommended for anyone looking for tech gadgets in Lagos.",
  },
];

export default function VendorProfilePage() {
  const params = useParams();
  const [messageText, setMessageText] = useState("");
  const [showQR, setShowQR] = useState(false);

  return (
    <>
      {/* JSON-LD Structured Data */}
      <LocalBusinessJsonLd
        name={vendor.name}
        description={vendor.description}
        url={`https://dbmart.ng/vendors/${vendor.slug}`}
        image={vendor.logo}
        telephone={vendor.phone}
        email={vendor.email}
        address={vendor.location}
        priceRange="₦₦"
        aggregateRating={{
          ratingValue: vendor.rating,
          reviewCount: vendor.reviews,
        }}
      />
      <VendorProfileAnimations>
      <Header />
      <main className="pt-16">
        <StaggerEntrance>
        {/* Cover Image */}
        <div className="vendor-cover relative h-48 sm:h-64 lg:h-80 overflow-hidden">
          <Image
            src={vendor.coverImage}
            alt=""
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>

        {/* Vendor Info Bar */}
        <div className="relative -mt-20 z-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="vendor-info-card glass-strong rounded-2xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start gap-6">
                {/* Logo */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 border-4 border-white shadow-lg">
                  <Image
                    src={vendor.logo}
                    alt={vendor.name}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy font-display">
                      {vendor.name}
                    </h1>
                    {vendor.isVerified && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent-success/10 text-accent-success text-xs font-semibold">
                        <Shield className="h-3.5 w-3.5" />
                        Verified
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-gold/10 text-brand-gold text-xs font-semibold">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      {vendor.rating} ({vendor.reviews})
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
                    <span className="text-brand-slate font-medium uppercase tracking-wider">
                      {vendor.category}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {vendor.location}
                    </span>
                    <span
                      className={`flex items-center gap-1 ${
                        vendor.isOpen ? "text-accent-success" : "text-gray-400"
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      {vendor.isOpen ? "Open Now" : "Closed"}
                    </span>
                    <span className="flex items-center gap-1 text-accent-info">
                      <ThumbsUp className="h-3.5 w-3.5" />
                      Replies within {vendor.responseTime}
                    </span>
                  </div>

                  <p className="text-gray-600 leading-relaxed">
                    {vendor.description}
                  </p>
                </div>

                {/* Contact Buttons */}
                <div className="flex flex-wrap gap-3 sm:flex-col w-full sm:w-auto">
                  <a
                    href={whatsappDeepLink(vendor.whatsapp, `Hi ${vendor.name}, I saw your profile on DBMartNG and I'm interested in your products/services.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="gold" size="md" className="w-full sm:w-auto">
                      <MessageSquare className="h-4 w-4" />
                      WhatsApp
                    </Button>
                  </a>
                  <Button variant="primary" size="md" className="w-full sm:w-auto">
                    <Send className="h-4 w-4" />
                    Message
                  </Button>
                  <button
                    onClick={() => setShowQR(!showQR)}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto h-11 px-5 rounded-xl border border-gray-200 text-gray-600 hover:border-brand-navy hover:text-brand-navy transition-all text-sm font-semibold"
                  >
                    <QrCode className="h-4 w-4" />
                    QR Code
                  </button>
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
                {/* Gallery */}
                <div className="gallery-section">
                  <h2 className="text-xl font-bold text-brand-navy mb-4">Gallery</h2>
                  <div className="grid grid-cols-3 gap-3">
                    {vendor.gallery.map((img, i) => (
                      <div
                        key={i}
                        className="gallery-item relative aspect-square rounded-xl overflow-hidden"
                      >
                        <Image
                          src={img}
                          alt=""
                          fill
                          className="object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Listings */}
                <div className="listings-section">
                  <h2 className="text-xl font-bold text-brand-navy mb-4">
                    Products & Services
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {listings.map((listing) => (
                      <div
                        key={listing.title}
                        className="listing-card glass rounded-xl overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
                      >
                        <div className="relative h-40 overflow-hidden">
                          <Image
                            src={listing.image}
                            alt={listing.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-brand-navy">
                            {listing.title}
                          </h3>
                          <p className="text-sm text-gray-500 mb-2">
                            {listing.description}
                          </p>
                          <p className="text-lg font-bold text-brand-gold">
                            {listing.price}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reviews */}
                <div className="reviews-section">
                  <h2 className="text-xl font-bold text-brand-navy mb-4">
                    Reviews ({reviews.length})
                  </h2>
                  <div className="space-y-4">
                    {reviews.map((review, i) => (
                      <div key={i} className="review-item glass rounded-xl p-5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-brand-navy">
                            {review.name}
                          </span>
                          <span className="text-sm text-gray-400">
                            {review.date}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mb-2">
                          {Array.from({ length: 5 }).map((_, j) => (
                            <Star
                              key={j}
                              className={`h-4 w-4 ${
                                j < review.rating
                                  ? "text-brand-gold fill-current"
                                  : "text-gray-200"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-gray-600 text-sm">{review.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="vendor-sidebar space-y-6">
                {/* Contact Card */}
                <div className="glass rounded-2xl p-6">
                  <h3 className="font-bold text-brand-navy mb-4">Contact Info</h3>
                  <div className="space-y-3">
                    <a
                      href={`tel:${vendor.phone}`}
                      className="flex items-center gap-3 text-sm text-gray-600 hover:text-brand-navy"
                    >
                      <Phone className="h-4 w-4 text-brand-gold" />
                      {vendor.phone}
                    </a>
                    <a
                      href={`mailto:${vendor.email}`}
                      className="flex items-center gap-3 text-sm text-gray-600 hover:text-brand-navy"
                    >
                      <Mail className="h-4 w-4 text-brand-gold" />
                      {vendor.email}
                    </a>
                    <a
                      href={vendor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-sm text-gray-600 hover:text-brand-navy"
                    >
                      <Globe className="h-4 w-4 text-brand-gold" />
                      {vendor.website.replace("https://", "")}
                      <ExternalLink className="h-3 w-3 ml-auto" />
                    </a>
                    <a
                      href={whatsappDeepLink(vendor.whatsapp, `Hi ${vendor.name}, I saw your profile on DBMartNG!`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-sm text-gray-600 hover:text-brand-navy"
                    >
                      <MessageSquare className="h-4 w-4 text-brand-gold" />
                      WhatsApp
                    </a>
                  </div>
                </div>

                {/* Message Form */}
                <div className="glass rounded-2xl p-6">
                  <h3 className="font-bold text-brand-navy mb-4">
                    Send a Message
                  </h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Your name"
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                    />
                    <input
                      type="email"
                      placeholder="Your email"
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
                    />
                    <textarea
                      rows={4}
                      placeholder="Write your message..."
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent resize-none"
                    />
                    <Button variant="gold" size="sm" className="w-full">
                      <Send className="h-4 w-4" />
                      Send Message
                    </Button>
                  </div>
                </div>

                {/* Share */}
                <div className="glass rounded-2xl p-6">
                  <h3 className="font-bold text-brand-navy mb-4">Share</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                    <Button variant="ghost" size="sm">
                      <QrCode className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </StaggerEntrance>
      </main>
      </VendorProfileAnimations>
      <Footer />
    </>
  );
}
