import Link from "next/link";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-secondary px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-brand-gold/10 flex items-center justify-center mx-auto mb-6">
          <WifiOff className="h-10 w-10 text-brand-gold" />
        </div>
        <h1 className="text-2xl font-bold text-brand-navy font-display mb-3">
          You&apos;re Offline
        </h1>
        <p className="text-gray-600 mb-8">
          It looks like you&apos;re not connected to the internet. Some pages
          may not be available until you reconnect.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-navy text-white font-semibold hover:bg-brand-navy-light transition-colors"
        >
          Try Again
        </Link>
        <div className="mt-8 text-sm text-gray-400">
          <p>Pages you&apos;ve visited recently may still be available.</p>
          <Link href="/browse" className="text-brand-gold hover:underline mt-1 inline-block">
            Browse Vendors
          </Link>
        </div>
      </div>
    </div>
  );
}
