"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import StaggerEntrance from "@/components/animations/StaggerEntrance";
import {
  Clock,
  ChevronLeft,
  Store,
  Loader2,
  Search,
  MapPin,
  Star,
  Trash2,
  Eye,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ViewedVendor {
  id: string;
  vendor_id: string;
  business_name: string;
  slug: string;
  category: string;
  location: string;
  logo_url: string | null;
  viewed_at: string;
}

export default function BuyerHistoryPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const [history, setHistory] = useState<ViewedVendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || role !== "buyer")) {
      router.push("/auth");
    }
  }, [user, role, authLoading, router]);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch("/api/history");
      const data = await response.json();
      setHistory(data.data || []);
    } catch {
      // Silently handle — empty state will show
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchHistory();
  }, [user, fetchHistory]);

  const handleClearHistory = async () => {
    try {
      await fetch("/api/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearAll: true }),
      });
      setHistory([]);
    } catch {
      // Silently handle
    }
  };

  // Group history by date
  const groupedHistory = history.reduce<Record<string, ViewedVendor[]>>(
    (groups, item) => {
      const date = new Date(item.viewed_at).toLocaleDateString("en-NG", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
      return groups;
    },
    {}
  );

  if (authLoading) {
    return (
      <>
        <Header />
        <div className="pt-20 min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen bg-surface-secondary">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
          <StaggerEntrance>
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/buyer"
                className="text-gray-400 hover:text-brand-navy transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy font-display">
                  Recently Viewed
                </h1>
                <p className="text-sm text-gray-500">
                  Vendors you&apos;ve checked out recently.
                </p>
              </div>
            </div>
            {history.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearHistory}
              >
                <Trash2 className="h-4 w-4" />
                Clear History
              </Button>
            )}
          </div>

          {/* Summary Card */}
          <div className="glass rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-gold/10 flex items-center justify-center">
                <Eye className="h-6 w-6 text-brand-gold" />
              </div>
              <div>
                <div className="text-2xl font-bold text-brand-navy">
                  {history.length}
                </div>
                <div className="text-sm text-gray-500">
                  {history.length === 1
                    ? "vendor viewed recently"
                    : "vendors viewed recently"}
                </div>
              </div>
            </div>
          </div>

          {/* History */}
          {loading ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand-gold mx-auto mb-4" />
              <p className="text-gray-500">Loading your history...</p>
            </div>
          ) : history.length === 0 ? (
            /* Empty State */
            <div className="glass rounded-2xl p-12 text-center">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-bold text-brand-navy mb-2 font-display">
                No Recent Activity
              </h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                Vendors you visit will show up here so you can easily find them
                again. Start browsing to build your history.
              </p>
              <Link href="/browse">
                <Button variant="gold" size="lg">
                  <Search className="h-4 w-4" />
                  Start Browsing
                </Button>
              </Link>
            </div>
          ) : (
            /* Grouped History */
            <div className="space-y-8">
              {Object.entries(groupedHistory).map(([date, vendors]) => (
                <div key={date}>
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">
                    {date}
                  </h3>
                  <div className="space-y-3">
                    {vendors.map((vendor) => (
                      <Link
                        key={vendor.id}
                        href={`/vendors/${vendor.slug}`}
                        className="glass rounded-2xl p-5 hover:shadow-md transition-shadow flex items-center gap-4 group block"
                      >
                        <div className="w-12 h-12 rounded-xl bg-brand-gold/10 flex items-center justify-center shrink-0 group-hover:bg-brand-gold/20 transition-colors">
                          {vendor.logo_url ? (
                            <img
                              src={vendor.logo_url}
                              alt={vendor.business_name}
                              className="w-full h-full object-cover rounded-xl"
                            />
                          ) : (
                            <Store className="h-6 w-6 text-brand-gold" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-brand-navy truncate">
                            {vendor.business_name}
                          </h4>
                          <div className="flex items-center gap-3 mt-1">
                            {vendor.category && (
                              <span className="text-xs text-brand-gold font-medium">
                                {vendor.category}
                              </span>
                            )}
                            {vendor.location && (
                              <span className="flex items-center gap-1 text-xs text-gray-400">
                                <MapPin className="h-3 w-3" />
                                {vendor.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 shrink-0">
                          {formatDistanceToNow(new Date(vendor.viewed_at), {
                            addSuffix: true,
                          })}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          </StaggerEntrance>
        </div>
      </main>
    </>
  );
}
