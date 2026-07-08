"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import StaggerEntrance from "@/components/animations/StaggerEntrance";
import {
  Store,
  Package,
  CreditCard,
  CheckCircle,
  MessageSquare,
  AlertTriangle,
  Star,
  TrendingUp,
  Users,
  DollarSign,
  PieChart,
  RefreshCw,
} from "lucide-react";

interface AnalyticsData {
  overview: {
    totalVendors: number;
    activeListings: number;
    proSubscriptions: number;
    pendingReviews: number;
    totalReviews: number;
    totalMessages: number;
    openComplaints: number;
    averageRating: number;
  };
  trends: {
    newVendorsThisWeek: number;
    newListingsThisWeek: number;
  };
  revenue: {
    monthlyEstimateNaira: number;
    proVendorCount: number;
  };
  categories: { name: string; count: number }[];
}

export default function AdminAnalyticsPage() {
  const { user, role, loading, signOut } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || role !== "admin")) {
      router.push("/auth");
    }
  }, [user, role, loading, router]);

  const fetchAnalytics = async () => {
    setFetching(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/analytics");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || "Failed to load analytics");
      }
    } catch {
      setError("Failed to connect to analytics API");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (user && role === "admin") {
      fetchAnalytics();
    }
  }, [user, role]);

  if (loading || fetching) {
    return (
      <>
        <Header />
        <div className="pt-20 min-h-screen flex items-center justify-center">
          <div className="animate-pulse-soft text-brand-navy font-semibold">
            Loading analytics...
          </div>
        </div>
      </>
    );
  }

  const stats = data
    ? [
        {
          label: "Total Vendors",
          value: data.overview.totalVendors.toLocaleString(),
          change: `+${data.trends.newVendorsThisWeek} this week`,
          icon: Store,
          trend: data.trends.newVendorsThisWeek > 0 ? "up" : "neutral",
        },
        {
          label: "Active Listings",
          value: data.overview.activeListings.toLocaleString(),
          change: `+${data.trends.newListingsThisWeek} this week`,
          icon: Package,
          trend: data.trends.newListingsThisWeek > 0 ? "up" : "neutral",
        },
        {
          label: "Pro Subscriptions",
          value: data.overview.proSubscriptions.toLocaleString(),
          change: `${data.revenue.monthlyEstimateNaira.toLocaleString()} NGN/mo`,
          icon: CreditCard,
          trend: "up",
        },
        {
          label: "Pending Reviews",
          value: data.overview.pendingReviews.toLocaleString(),
          change: data.overview.pendingReviews > 0 ? "Needs attention" : "All clear",
          icon: CheckCircle,
          trend: data.overview.pendingReviews > 0 ? "neutral" : "up",
        },
      ]
    : [];

  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen bg-surface-secondary">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <StaggerEntrance>
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy font-display">
                  Analytics
                </h1>
                <p className="text-gray-500">
                  Platform-wide metrics and insights
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={fetchAnalytics}>
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
                <Link href="/dashboard/admin">
                  <Button variant="ghost" size="sm">
                    Back to Admin
                  </Button>
                </Link>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-accent-error/5 border border-accent-error/20 text-accent-error text-sm">
                {error}
              </div>
            )}

            {data ? (
              <>
                {/* Stats Grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {stats.map((stat) => (
                    <div key={stat.label} className="glass rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <stat.icon className="h-5 w-5 text-brand-gold" />
                        <span
                          className={`text-xs font-semibold ${
                            stat.trend === "up"
                              ? "text-accent-success"
                              : "text-accent-warning"
                          }`}
                        >
                          {stat.change}
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-brand-navy">
                        {stat.value}
                      </div>
                      <div className="text-sm text-gray-500">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Two-column insight panels */}
                <div className="grid lg:grid-cols-2 gap-6 mb-8">
                  {/* Engagement */}
                  <div className="glass rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-brand-navy/5 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-brand-navy" />
                      </div>
                      <h3 className="font-bold text-brand-navy">Engagement</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Star className="h-4 w-4 text-brand-gold" />
                          Average Rating
                        </div>
                        <span className="font-bold text-brand-navy">
                          {data.overview.averageRating} / 5
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MessageSquare className="h-4 w-4 text-accent-info" />
                          Total Messages
                        </div>
                        <span className="font-bold text-brand-navy">
                          {data.overview.totalMessages.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Star className="h-4 w-4 text-brand-gold" />
                          Total Reviews
                        </div>
                        <span className="font-bold text-brand-navy">
                          {data.overview.totalReviews.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <AlertTriangle className="h-4 w-4 text-accent-error" />
                          Open Complaints
                        </div>
                        <span className="font-bold text-accent-error">
                          {data.overview.openComplaints}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Revenue */}
                  <div className="glass rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-accent-success/5 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-accent-success" />
                      </div>
                      <h3 className="font-bold text-brand-navy">Revenue</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users className="h-4 w-4 text-accent-success" />
                          Pro Vendors
                        </div>
                        <span className="font-bold text-brand-navy">
                          {data.revenue.proVendorCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <CreditCard className="h-4 w-4 text-accent-success" />
                          Monthly Revenue (est.)
                        </div>
                        <span className="font-bold text-brand-navy text-lg">
                          ₦{data.revenue.monthlyEstimateNaira.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <TrendingUp className="h-4 w-4 text-accent-success" />
                          Annual Run Rate
                        </div>
                        <span className="font-bold text-brand-navy">
                          ₦{(data.revenue.monthlyEstimateNaira * 12).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Category Breakdown */}
                <div className="glass rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-brand-gold/10 flex items-center justify-center">
                      <PieChart className="h-5 w-5 text-brand-gold" />
                    </div>
                    <h3 className="font-bold text-brand-navy">
                      Vendor Distribution by Category
                    </h3>
                  </div>
                  {data.categories.length > 0 ? (
                    <div className="space-y-3">
                      {data.categories.map((cat) => {
                        const maxCount = Math.max(
                          ...data.categories.map((c) => c.count),
                          1
                        );
                        const pct = Math.round((cat.count / maxCount) * 100);
                        return (
                          <div key={cat.name} className="flex items-center gap-4">
                            <span className="text-sm text-gray-600 w-40 truncate">
                              {cat.name}
                            </span>
                            <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-brand-gold transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-sm font-bold text-brand-navy w-12 text-right">
                              {cat.count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No vendor data available yet.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <p className="text-gray-500">
                  Unable to load analytics data.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-4"
                  onClick={fetchAnalytics}
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry
                </Button>
              </div>
            )}
          </StaggerEntrance>
        </div>
      </main>
    </>
  );
}
