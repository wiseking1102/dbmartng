import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="min-h-[60vh] flex items-center justify-center pt-20">
        <div className="text-center px-4">
          <div className="text-8xl sm:text-9xl font-bold text-brand-navy/10 font-display mb-4">
            404
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-brand-navy font-display mb-4">
            Page Not Found
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
            Let&apos;s get you back on track.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/">
              <Button variant="primary" size="lg">
                Go Home
              </Button>
            </Link>
            <Link href="/browse">
              <Button variant="outline" size="lg">
                Browse Vendors
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
