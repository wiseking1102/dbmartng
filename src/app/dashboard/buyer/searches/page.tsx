"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import StaggerEntrance from "@/components/animations/StaggerEntrance";
import { toast } from "sonner";
import {
  Search,
  Bell,
  BellOff,
  Trash2,
  ChevronLeft,
  Clock,
  Loader2,
  ExternalLink,
  BookmarkCheck,
  Filter,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SavedSearch {
  id: string;
  query: string;
  filters: Record<string, string> | null;
  notify_on_match: boolean;
  created_at: string;
}

export default function SavedSearchesPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || role !== "buyer")) {
      router.push("/auth");
    }
  }, [user, role, authLoading, router]);

  const fetchSearches = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch("/api/saved-searches");
      const data = await response.json();
      setSearches(data.data || []);
    } catch {
      toast.error("Failed to load saved searches");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchSearches();
  }, [user, fetchSearches]);

  const handleToggleNotify = async (searchId: string) => {
    setTogglingId(searchId);
    try {
      const response = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_notify",
          searchId,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setSearches((prev) =>
          prev.map((s) =>
            s.id === searchId
              ? { ...s, notify_on_match: !s.notify_on_match }
              : s
          )
        );
        toast.success(result.data.notify_on_match
          ? "Notifications enabled for this search"
          : "Notifications disabled for this search"
        );
      } else {
        toast.error(result.error || "Failed to update");
      }
    } catch {
      toast.error("Failed to update notification setting");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (searchId: string) => {
    try {
      const response = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          searchId,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setSearches((prev) => prev.filter((s) => s.id !== searchId));
        setDeleteConfirm(null);
        toast.success("Saved search deleted");
      } else {
        toast.error(result.error || "Failed to delete");
      }
    } catch {
      toast.error("Failed to delete saved search");
    }
  };

  const formatFilters = (filters: Record<string, string> | null): string => {
    if (!filters) return "";
    const parts = Object.entries(filters).filter(([, v]) => v);
    if (parts.length === 0) return "";
    return parts.map(([key, val]) => `${key}: ${val}`).join(", ");
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
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
          <StaggerEntrance>
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <Link
              href="/dashboard/buyer"
              className="text-gray-400 hover:text-brand-navy transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy font-display">
                Saved Searches
              </h1>
              <p className="text-sm text-gray-500">
                View and manage your saved searches. Get notified when new
                matching vendors appear.
              </p>
            </div>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand-gold mx-auto mb-4" />
              <p className="text-gray-500">Loading saved searches...</p>
            </div>
          ) : searches.length === 0 ? (
            /* Empty State */
            <div className="glass rounded-2xl p-12 text-center">
              <BookmarkCheck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-bold text-brand-navy mb-2 font-display">
                No Saved Searches Yet
              </h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                When you search for vendors on the browse page, you can save
                your search to get notified when new matching businesses appear.
              </p>
              <Link href="/browse">
                <Button variant="gold" size="lg">
                  <Search className="h-4 w-4" />
                  Browse Vendors
                </Button>
              </Link>
            </div>
          ) : (
            /* Search List */
            <div className="space-y-3">
              {searches.map((search) => {
                const filterText = formatFilters(search.filters);
                return (
                  <div
                    key={search.id}
                    className="glass rounded-2xl p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Search className="h-4 w-4 text-brand-gold shrink-0" />
                          <h3 className="font-bold text-brand-navy truncate">
                            {search.query}
                          </h3>
                        </div>

                        {filterText && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                            <Filter className="h-3 w-3" />
                            <span>{filterText}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Saved{" "}
                            {formatDistanceToNow(
                              new Date(search.created_at),
                              { addSuffix: true }
                            )}
                          </span>
                          <span
                            className={`flex items-center gap-1 ${
                              search.notify_on_match
                                ? "text-accent-success"
                                : ""
                            }`}
                          >
                            {search.notify_on_match ? (
                              <Bell className="h-3 w-3" />
                            ) : (
                              <BellOff className="h-3 w-3" />
                            )}
                            {search.notify_on_match
                              ? "Notifications on"
                              : "Notifications off"}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/browse?q=${encodeURIComponent(search.query)}`}
                          className="p-2 rounded-lg text-gray-400 hover:text-accent-info hover:bg-accent-info/5 transition-all"
                          title="Run this search"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>

                        <button
                          onClick={() => handleToggleNotify(search.id)}
                          disabled={togglingId === search.id}
                          className={`p-2 rounded-lg transition-all ${
                            search.notify_on_match
                              ? "text-accent-success hover:bg-accent-success/5"
                              : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                          }`}
                          title={
                            search.notify_on_match
                              ? "Disable notifications"
                              : "Enable notifications"
                          }
                        >
                          {togglingId === search.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : search.notify_on_match ? (
                            <Bell className="h-4 w-4" />
                          ) : (
                            <BellOff className="h-4 w-4" />
                          )}
                        </button>

                        {deleteConfirm === search.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(search.id)}
                              className="px-2 py-1.5 rounded-lg bg-accent-error text-white text-xs font-semibold hover:bg-red-600 transition-colors"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-2 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-gray-200 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(search.id)}
                            className="p-2 rounded-lg text-gray-400 hover:text-accent-error hover:bg-red-50 transition-all"
                            title="Delete saved search"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Summary */}
              <div className="pt-2 text-center">
                <p className="text-xs text-gray-400">
                  {searches.length} saved {searches.length === 1 ? "search" : "searches"}
                </p>
              </div>
            </div>
          )}
          </StaggerEntrance>
        </div>
      </main>
    </>
  );
}
