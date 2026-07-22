"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import StaggerEntrance from "@/components/animations/StaggerEntrance";
import {
  Heart,
  ChevronLeft,
  Store,
  Loader2,
  Search,
  MapPin,
  Star,
  Trash2,
} from "lucide-react";

interface FavoriteVendor {
  id: string;
  vendor_id: string;
  business_name: string;
  slug: string;
  category: string;
  location: string;
  rating: number;
  logo_url: string | null;
  created_at: string;
}

export default function BuyerFavoritesPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || role !== "buyer")) {
      router.push("/auth");
    }
  }, [user, role, authLoading, router]);

  const fetchFavorites = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch("/api/favorites");
      const data = await response.json();
      setFavorites(data.data || []);
    } catch {
      // Silently handle — empty state will show
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchFavorites();
  }, [user, fetchFavorites]);

  const handleRemove = async (favoriteId: string) => {
    setRemovingId(favoriteId);
    try {
      await fetch("/api/favorites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favoriteId }),
      });
      setFavorites((prev) => prev.filter((f) => f.id !== favoriteId));
    } catch {
      // Silently handle
    } finally {
      setRemovingId(null);
    }
  };

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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
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
                  Saved Vendors
                </h1>
                <p className="text-sm text-gray-500">
                  Your favorite businesses, all in one place.
                </p>
              </div>
            </div>
            <Link href="/browse">
              <Button variant="gold" size="sm">
                <Search className="h-4 w-4" />
                Browse Vendors
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-brand-gold/10 flex items-center justify-center">
                  <Heart className="h-6 w-6 text-brand-gold" />
                </div>
              </div>
              <div className="text-2xl font-bold text-brand-navy">
                {favorites.length}
              </div>
              <div className="text-sm text-gray-500">Saved Vendors</div>
            </div>
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-brand-navy/5 flex items-center justify-center">
                  <Store className="h-6 w-6 text-brand-navy" />
                </div>
              </div>
              <div className="text-2xl font-bold text-brand-navy">0</div>
              <div className="text-sm text-gray-500">Contacted</div>
            </div>
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-brand-gold/10 flex items-center justify-center">
                  <Star className="h-6 w-6 text-brand-gold" />
                </div>
              </div>
              <div className="text-2xl font-bold text-brand-navy">0</div>
              <div className="text-sm text-gray-500">Reviews Given</div>
            </div>
          </div>

          {/* Favorites Grid */}
          {loading ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand-gold mx-auto mb-4" />
              <p className="text-gray-500">Loading your saved vendors...</p>
            </div>
          ) : favorites.length === 0 ? (
            /* Empty State */
            <div className="glass rounded-2xl p-12 text-center">
              <Heart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-bold text-brand-navy mb-2 font-display">
                No Saved Vendors Yet
              </h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                When you find a vendor you like, tap the heart icon to save them
                here for easy access later.
              </p>
              <Link href="/browse">
                <Button variant="gold" size="lg">
                  <Store className="h-4 w-4" />
                  Browse Vendors
                </Button>
              </Link>
            </div>
          ) : (
            /* Vendor Cards Grid */
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {favorites.map((vendor) => (
                <div
                  key={vendor.id}
                  className="glass rounded-2xl p-5 hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-brand-gold/10 flex items-center justify-center shrink-0">
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
                    <button
                      onClick={() => handleRemove(vendor.id)}
                      disabled={removingId === vendor.id}
                      className="p-2 rounded-lg text-gray-400 hover:text-accent-error hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                      title="Remove from saved"
                    >
                      {removingId === vendor.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <Link href={`/vendors/${vendor.slug}`}>
                    <h3 className="font-bold text-brand-navy mb-1 hover:text-brand-gold transition-colors">
                      {vendor.business_name}
                    </h3>
                  </Link>
                  {vendor.category && (
                    <p className="text-xs text-brand-gold font-medium mb-1">
                      {vendor.category}
                    </p>
                  )}
                  {vendor.location && (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <MapPin className="h-3 w-3" />
                      <span>{vendor.location}</span>
                    </div>
                  )}
                  {vendor.rating > 0 && (
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                      <Star className="h-3 w-3 text-brand-gold fill-brand-gold" />
                      <span>{vendor.rating.toFixed(1)}</span>
                    </div>
                  )}
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
