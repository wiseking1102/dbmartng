"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search, ArrowRight } from "lucide-react";

/*
 * Homepage hero — client island.
 *
 * Contains everything that needs the browser:
 * - background video "loaded" fade-in state
 * - decorative orbs (deterministic styles, so SSR markup
 *   and hydration always match)
 * - the hero search box, wired to /browse?q=
 */

const HERO_ORBS = [
  { width: 180, height: 120, left: "8%", top: "15%", delay: "0s", duration: "10s" },
  { width: 260, height: 140, left: "55%", top: "8%", delay: "1.2s", duration: "9s" },
  { width: 140, height: 200, left: "30%", top: "55%", delay: "2.4s", duration: "12s" },
  { width: 200, height: 110, left: "70%", top: "48%", delay: "3.6s", duration: "8s" },
  { width: 120, height: 160, left: "12%", top: "70%", delay: "1.8s", duration: "11s" },
  { width: 160, height: 120, left: "45%", top: "75%", delay: "3s", duration: "14s" },
] as const;

export default function HeroSection() {
  const [videoLoaded, setVideoLoaded] = useState(false);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
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
          {HERO_ORBS.map((orb, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-brand-gold/10 blur-3xl animate-drift"
              style={{
                width: `${orb.width}px`,
                height: `${orb.height}px`,
                left: orb.left,
                top: orb.top,
                animationDelay: orb.delay,
                animationDuration: orb.duration,
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
                <form action="/browse" method="get">
                  <input
                    type="text"
                    name="q"
                    placeholder="Search for businesses, products, or services..."
                    className="w-full h-14 pl-14 pr-5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent text-lg transition-all duration-300"
                  />
                </form>
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
  );
}
