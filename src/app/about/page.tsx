import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Target, Eye, Heart } from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about DBMartNG — Nigeria's premier business directory and marketplace. Meet the founders and our mission.",
};

const founders = [
  {
    name: "Brume Godgift",
    title: "Co-founder & Co-CEO",
    bio: "Brume Godgift (Kediehor Oghenebrume) is a software engineer and Co-founder & Co-CEO of DBMartNG, based in Asaba, Delta State, Nigeria. He is passionate about building digital platforms that make it easier for Nigerian businesses to reach the customers who need them. At DBMartNG, he works across product, technology, and business strategy to help bring the platform to life.",
    initials: "BG",
  },
  {
    name: "Gold Dylan",
    title: "Co-Founder & Co-CEO",
    bio: "Gold Dylan is the Co-Founder and Co-CEO of DBMartNG, a Nigerian-first multivendor business directory and marketplace, where he serves as one of two superior admins overseeing platform strategy and operations. He is also a Medical Laboratory Science student, bringing a background in pathology and biorisk management alongside his work building consumer-facing technology.",
    initials: "GD",
  },
];

const values = [
  {
    icon: Target,
    title: "Our Mission",
    desc: "To make every Nigerian business discoverable online, regardless of size or location, by providing a trusted platform where buyers and sellers connect directly.",
  },
  {
    icon: Eye,
    title: "Our Vision",
    desc: "A Nigeria where finding and supporting local businesses is as easy as opening your phone — creating economic opportunities in every community.",
  },
  {
    icon: Heart,
    title: "Our Commitment",
    desc: "We are committed to transparency, trust, and fairness. DBMartNG facilitates discovery and contact between buyers and vendors but is not a party to any off-platform transaction.",
  },
];

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 mesh-navy opacity-30" />
          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <div className="badge-gold inline-flex mb-4">
              About Us
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-brand-navy font-display mb-4 leading-tight">
              About <span className="gradient-text">DBMartNG</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Nigeria&apos;s premier business directory and marketplace —
              connecting buyers with verified vendors across the nation.
            </p>
          </div>
        </section>

        {/* Values */}
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-8">
              {values.map((v) => (
                <div key={v.title} className="bento-card p-8 text-center group">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-gold/10 to-brand-gold/5 flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-300">
                    <v.icon className="h-7 w-7 text-brand-gold" />
                  </div>
                  <h2 className="text-xl font-bold text-brand-navy mb-3">{v.title}</h2>
                  <p className="text-gray-600 leading-relaxed">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Founders */}
        <section id="credits" className="py-20 bg-surface-secondary">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-brand-navy font-display text-center mb-12">
              Meet the Founders
            </h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {founders.map((founder) => (
                <div key={founder.name} className="glass rounded-2xl p-8 text-center">
                  <div className="w-24 h-24 rounded-full bg-brand-navy/5 flex items-center justify-center mx-auto mb-5">
                    <span className="text-3xl font-bold text-brand-navy font-display">
                      {founder.initials}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-brand-navy mb-1">
                    {founder.name}
                  </h3>
                  <p className="text-brand-gold font-semibold text-sm mb-4">
                    {founder.title}
                  </p>
                  <p className="text-gray-600 leading-relaxed">{founder.bio}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-20 bg-brand-navy text-white relative overflow-hidden">
          <div className="absolute inset-0 mesh-navy" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { value: "500+", label: "Vendors" },
                { value: "2,000+", label: "Listings" },
                { value: "10,000+", label: "Visitors" },
                { value: "36+", label: "Categories" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-3xl sm:text-4xl font-bold text-brand-gold font-display mb-2">
                    {stat.value}
                  </div>
                  <div className="text-gray-300">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 text-center relative overflow-hidden">
          <div className="absolute inset-0 mesh-gold" />
          <div className="relative z-10">
          <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-brand-navy font-display mb-4">
              Join Our Community
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Whether you&apos;re a buyer looking for trusted vendors or a business
              wanting to grow your reach, DBMartNG is here for you.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/auth?type=vendor">
                <Button variant="gold" size="lg">
                  List Your Business
                </Button>
              </Link>
              <Link href="/auth">
                <Button variant="primary" size="lg">
                  Start Browsing
                </Button>
              </Link>
            </div>
          </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
