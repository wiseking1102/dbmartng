import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Search, Home, Store, ArrowRight, HelpCircle } from "lucide-react";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="min-h-screen flex items-center justify-center pt-24 pb-16 bg-surface-secondary">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <div className="glass rounded-3xl p-8 sm:p-12 border border-white/50 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-brand-navy/10 rounded-full blur-3xl pointer-events-none" />

            <div className="text-7xl sm:text-8xl font-black text-brand-navy/15 font-display mb-2 tracking-widest">
              404
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-brand-navy font-display mb-3">
              Page Not Found
            </h1>
            <p className="text-gray-600 mb-8 max-w-md mx-auto text-sm sm:text-base leading-relaxed">
              We couldn&apos;t find the page or vendor listing you were looking for. It may have been renamed or moved.
            </p>

            {/* Quick Search Redirect Form */}
            <form action="/browse" method="GET" className="mb-8 max-w-md mx-auto">
              <div className="relative flex items-center">
                <Search className="absolute left-4 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  name="q"
                  placeholder="Search businesses, products, services..."
                  className="w-full pl-11 pr-24 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold bg-white text-sm"
                />
                <button
                  type="submit"
                  className="absolute right-2 px-4 py-1.5 bg-brand-navy text-white text-xs font-semibold rounded-xl hover:bg-brand-navy/90 transition-colors"
                >
                  Search
                </button>
              </div>
            </form>

            <div className="flex flex-wrap gap-3 justify-center pt-2 border-t border-gray-100">
              <Link href="/">
                <Button variant="primary">
                  <Home className="h-4 w-4" /> Go Home
                </Button>
              </Link>
              <Link href="/browse">
                <Button variant="gold">
                  <Store className="h-4 w-4" /> Browse Directory
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" className="border-brand-navy text-brand-navy">
                  <HelpCircle className="h-4 w-4" /> Contact Support
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
