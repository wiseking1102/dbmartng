import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import {
  UtensilsCrossed,
  Shirt,
  Cpu,
  Sparkles,
  Sofa,
  Car,
  GraduationCap,
  Building2,
  Landmark,
  Sprout,
  Truck,
  Film,
  HardHat,
  Scale,
  Plane,
  Dumbbell,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Categories",
  description:
    "Browse all business categories on DBMartNG — from Food & Beverages to Tech, Fashion, Real Estate, and more. Find Nigerian vendors by industry.",
  openGraph: {
    title: "Categories — DBMartNG",
    description:
      "Explore all business categories on DBMartNG. Find verified Nigerian vendors across every industry.",
  },
};

const categories = [
  {
    name: "Food & Beverages",
    slug: "food-beverages",
    icon: UtensilsCrossed,
    desc: "Restaurants, catering, food vendors, and drink suppliers.",
  },
  {
    name: "Fashion & Style",
    slug: "fashion-style",
    icon: Shirt,
    desc: "Clothing, accessories, tailoring, and fashion designers.",
  },
  {
    name: "Tech & Electronics",
    slug: "tech-electronics",
    icon: Cpu,
    desc: "Gadgets, repairs, software, and IT services.",
  },
  {
    name: "Health & Beauty",
    slug: "health-beauty",
    icon: Sparkles,
    desc: "Skincare, cosmetics, wellness, and beauty services.",
  },
  {
    name: "Home & Furniture",
    slug: "home-furniture",
    icon: Sofa,
    desc: "Interior décor, furniture makers, and home essentials.",
  },
  {
    name: "Automotive",
    slug: "automotive",
    icon: Car,
    desc: "Car sales, auto repairs, spare parts, and detailing.",
  },
  {
    name: "Education & Training",
    slug: "education-training",
    icon: GraduationCap,
    desc: "Schools, tutors, online courses, and skill training.",
  },
  {
    name: "Real Estate",
    slug: "real-estate",
    icon: Building2,
    desc: "Property sales, rentals, agents, and land services.",
  },
  {
    name: "Finance & Banking",
    slug: "finance-banking",
    icon: Landmark,
    desc: "Fintech, POS agents, insurance, and financial advisory.",
  },
  {
    name: "Agriculture",
    slug: "agriculture",
    icon: Sprout,
    desc: "Farm produce, agro-allied services, and livestock.",
  },
  {
    name: "Logistics & Delivery",
    slug: "logistics-delivery",
    icon: Truck,
    desc: "Courier services, freight, and last-mile delivery.",
  },
  {
    name: "Media & Entertainment",
    slug: "media-entertainment",
    icon: Film,
    desc: "Photography, videography, DJs, and event planning.",
  },
  {
    name: "Construction",
    slug: "construction",
    icon: HardHat,
    desc: "Builders, architects, plumbers, and electricians.",
  },
  {
    name: "Legal Services",
    slug: "legal-services",
    icon: Scale,
    desc: "Lawyers, notaries, corporate law, and legal consultants.",
  },
  {
    name: "Hospitality & Travel",
    slug: "hospitality-travel",
    icon: Plane,
    desc: "Hotels, travel agencies, tour guides, and resorts.",
  },
  {
    name: "Sports & Fitness",
    slug: "sports-fitness",
    icon: Dumbbell,
    desc: "Gyms, trainers, sports equipment, and fitness centres.",
  },
];

export default function CategoriesPage() {
  return (
    <>
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="py-16 bg-gradient-to-b from-brand-navy/5 to-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-brand-navy font-display mb-4">
              Browse Categories
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Explore verified Nigerian businesses across every industry.
              Find exactly what you need.
            </p>
          </div>
        </section>

        {/* Category Grid */}
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {categories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/browse?category=${cat.slug}`}
                  className="group glass rounded-2xl p-6 hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
                >
                  <div className="w-14 h-14 rounded-2xl bg-brand-gold/10 flex items-center justify-center mb-5 group-hover:bg-brand-gold/20 transition-colors">
                    <cat.icon className="h-7 w-7 text-brand-gold" />
                  </div>
                  <h2 className="text-lg font-bold text-brand-navy mb-2 group-hover:text-brand-gold transition-colors">
                    {cat.name}
                  </h2>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {cat.desc}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-brand-navy text-white text-center">
          <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold font-display mb-4">
              Don&apos;t See Your Category?
            </h2>
            <p className="text-gray-300 mb-8">
              We&apos;re adding new categories all the time. List your business
              and we&apos;ll make sure it fits right in.
            </p>
            <Link
              href="/auth?type=vendor"
              className="inline-flex items-center justify-center gap-2 font-semibold bg-brand-gold text-brand-navy hover:bg-brand-gold-light shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200 h-13 px-8 text-lg rounded-xl"
            >
              List Your Business
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
