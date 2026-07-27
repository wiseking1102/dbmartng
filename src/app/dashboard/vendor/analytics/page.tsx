"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import StaggerEntrance from "@/components/animations/StaggerEntrance";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  BarChart3,
  TrendingUp,
  Eye,
  MessageSquare,
  Phone,
  Download,
  ChevronLeft,
  Loader2,
  Calendar,
  Sparkles,
} from "lucide-react";

export default function VendorAnalyticsPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [stats, setStats] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || (role !== "vendor" && role !== "admin" && role !== "sub_admin"))) {
      router.push("/auth?type=vendor");
    }
  }, [user, role, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/vendor/stats");
        const json = await res.json();
        if (json.success) setStats(json.data);

        // Fetch vendor listings for breakdown
        const { data: rawProfile } = await supabase
          .from("vendor_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        const profile = rawProfile as any;
        if (profile) {
          const { data: listData } = await supabase
            .from("listings")
            .select("title, view_count, contact_click_count, status, price")
            .eq("vendor_id", profile.id)
            .order("view_count", { ascending: false });

          if (listData) setListings(listData);
        }
      } catch (err) {
        toast.error("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, supabase]);

  const handleExportCSV = () => {
    if (!listings.length) return toast.error("No data to export");

    const headers = ["Title", "Price (NGN)", "Status", "View Count", "Contact Clicks"];
    const rows = listings.map((l) => [
      `"${l.title.replace(/"/g, '""')}"`,
      l.price || 0,
      l.status,
      l.view_count || 0,
      l.contact_click_count || 0,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `dbmartng_analytics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Analytics CSV exported!");
  };

  if (authLoading || loading) {
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
      <main className="pt-20 min-h-screen bg-surface-secondary pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <StaggerEntrance>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <Link href="/dashboard/vendor" className="text-gray-400 hover:text-brand-navy">
                  <ChevronLeft className="h-5 w-5" />
                </Link>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy font-display">
                    Performance Analytics
                  </h1>
                  <p className="text-sm text-gray-500">
                    Track traffic, views, buyer interactions, and top performing listings
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="h-4 w-4" /> Export CSV Data
              </Button>
            </div>

            {/* Overview Stats */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="glass rounded-3xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Profile Impressions</span>
                  <Eye className="h-5 w-5 text-brand-gold" />
                </div>
                <div className="text-3xl font-bold text-brand-navy">
                  {stats?.profileViews?.toLocaleString() ?? 0}
                </div>
              </div>

              <div className="glass rounded-3xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Listing Views</span>
                  <TrendingUp className="h-5 w-5 text-brand-gold" />
                </div>
                <div className="text-3xl font-bold text-brand-navy">
                  {stats?.listingViews?.toLocaleString() ?? 0}
                </div>
              </div>

              <div className="glass rounded-3xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Inquiries Received</span>
                  <MessageSquare className="h-5 w-5 text-brand-gold" />
                </div>
                <div className="text-3xl font-bold text-brand-navy">
                  {stats?.messagesUnread ?? 0}
                </div>
              </div>

              <div className="glass rounded-3xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Active Listings</span>
                  <BarChart3 className="h-5 w-5 text-brand-gold" />
                </div>
                <div className="text-3xl font-bold text-brand-navy">
                  {stats?.totalListings ?? 0}
                </div>
              </div>
            </div>

            {/* Detailed Table */}
            <div className="glass rounded-3xl p-6 sm:p-8">
              <h2 className="text-lg font-bold text-brand-navy font-display mb-4">
                Listing Performance Breakdown
              </h2>

              {listings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No listing data available.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 font-medium">
                        <th className="pb-3 font-semibold">Title</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 font-semibold">Views</th>
                        <th className="pb-3 font-semibold">Contact Clicks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {listings.map((l, i) => (
                        <tr key={i} className="hover:bg-brand-navy/5 transition-colors">
                          <td className="py-4 font-semibold text-brand-navy">{l.title}</td>
                          <td className="py-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${
                                l.status === "approved"
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-amber-50 text-amber-600"
                              }`}
                            >
                              {l.status}
                            </span>
                          </td>
                          <td className="py-4 font-medium text-gray-700">{l.view_count || 0}</td>
                          <td className="py-4 font-medium text-gray-700">{l.contact_click_count || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </StaggerEntrance>
        </div>
      </main>
    </>
  );
}
