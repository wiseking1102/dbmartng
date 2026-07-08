"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import StaggerEntrance from "@/components/animations/StaggerEntrance";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  Store,
  Package,
  Shield,
  CreditCard,
  Settings,
  Star,
  BarChart3,
  MessageSquare,
  FileText,
  LogOut,
  CheckCircle,
  XCircle,
  TrendingUp,
  AlertTriangle,
  Megaphone,
} from "lucide-react";

interface LiveStats {
  totalVendors: number;
  activeListings: number;
  proSubscriptions: number;
  pendingReviews: number;
  newVendorsThisWeek: number;
  newListingsThisWeek: number;
  monthlyRevenue: number;
}

export default function AdminDashboardPage() {
  const { user, role, loading, signOut } = useAuth();
  const router = useRouter();
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);

  useEffect(() => {
    if (!loading && (!user || role !== "admin")) {
      router.push("/auth");
    }
  }, [user, role, loading, router]);

  useEffect(() => {
    if (user && role === "admin") {
      fetch("/api/admin/analytics")
        .then((r) => r.json())
        .then((json) => {
          if (json.success) {
            setLiveStats({
              totalVendors: json.data.overview.totalVendors,
              activeListings: json.data.overview.activeListings,
              proSubscriptions: json.data.overview.proSubscriptions,
              pendingReviews: json.data.overview.pendingReviews,
              newVendorsThisWeek: json.data.trends.newVendorsThisWeek,
              newListingsThisWeek: json.data.trends.newListingsThisWeek,
              monthlyRevenue: json.data.revenue.monthlyEstimateNaira,
            });
          }
        })
        .catch(() => {});
    }
  }, [user, role]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="pt-20 min-h-screen flex items-center justify-center">
          <div className="animate-pulse-soft text-brand-navy font-semibold">
            Loading admin panel...
          </div>
        </div>
      </>
    );
  }

  const adminModules = [
    {
      title: "Vendor Applications",
      description: "Approve or reject new vendor registrations",
      icon: Users,
      href: "/dashboard/admin/vendors",
      count: "12",
      color: "text-brand-navy",
      bg: "bg-brand-navy/5",
    },
    {
      title: "Listing Verification",
      description: "Review and verify product/service listings",
      icon: Package,
      href: "/dashboard/admin/listings",
      count: "28",
      color: "text-brand-gold",
      bg: "bg-brand-gold/10",
    },
    {
      title: "Sub-Admin Management",
      description: "Create and manage sub-admin accounts",
      icon: Shield,
      href: "/dashboard/admin/sub-admins",
      count: "3",
      color: "text-accent-info",
      bg: "bg-accent-info/5",
    },
    {
      title: "Ad & Sponsorship",
      description: "Review ad requests and manage company ads",
      icon: Megaphone,
      href: "/dashboard/admin/ads",
      count: "5",
      color: "text-accent-warning",
      bg: "bg-accent-warning/5",
    },
    {
      title: "Job Applications",
      description: "Review 'Work With Us' submissions",
      icon: FileText,
      href: "/dashboard/admin/jobs",
      count: "8",
      color: "text-accent-success",
      bg: "bg-accent-success/5",
    },
    {
      title: "Platform Settings",
      description: "Pricing, email config, and platform controls",
      icon: Settings,
      href: "/dashboard/admin/settings",
      count: "",
      color: "text-brand-slate",
      bg: "bg-brand-slate/5",
    },
    {
      title: "Reports & Disputes",
      description: "Handle vendor complaints and user reports",
      icon: AlertTriangle,
      href: "/dashboard/admin/reports",
      count: "2",
      color: "text-accent-error",
      bg: "bg-accent-error/5",
    },
    {
      title: "System Alerts",
      description: "View platform system alerts and logs",
      icon: AlertTriangle,
      href: "/dashboard/admin/alerts",
      count: "",
      color: "text-accent-warning",
      bg: "bg-accent-warning/5",
    },
    {
      title: "Analytics",
      description: "Platform-wide metrics and insights",
      icon: BarChart3,
      href: "/dashboard/admin/analytics",
      count: "",
      color: "text-brand-navy",
      bg: "bg-brand-navy/5",
    },
  ];

  const stats = [
    {
      label: "Total Vendors",
      value: liveStats?.totalVendors.toLocaleString() ?? "—",
      change: liveStats ? `+${liveStats.newVendorsThisWeek} this week` : "",
      icon: Store,
      trend: liveStats && liveStats.newVendorsThisWeek > 0 ? "up" : "neutral",
    },
    {
      label: "Active Listings",
      value: liveStats?.activeListings.toLocaleString() ?? "—",
      change: liveStats ? `+${liveStats.newListingsThisWeek} this week` : "",
      icon: Package,
      trend: liveStats && liveStats.newListingsThisWeek > 0 ? "up" : "neutral",
    },
    {
      label: "Pro Subscriptions",
      value: liveStats?.proSubscriptions.toLocaleString() ?? "—",
      change: liveStats ? `₦${liveStats.monthlyRevenue.toLocaleString()}/mo` : "",
      icon: CreditCard,
      trend: "up",
    },
    {
      label: "Pending Reviews",
      value: liveStats?.pendingReviews.toLocaleString() ?? "—",
      change: liveStats && liveStats.pendingReviews > 0 ? "Needs attention" : "All clear",
      icon: CheckCircle,
      trend: liveStats && liveStats.pendingReviews > 0 ? "neutral" : "up",
    },
  ];

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
                Admin Panel
              </h1>
              <p className="text-gray-500">
                Platform management and oversight
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/">
                <Button variant="outline" size="sm">
                  View Site
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>

          {/* Stats */}
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

          {/* Admin Modules Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {adminModules.map((module) => (
              <Link
                key={module.title}
                href={module.href}
                className="glass rounded-2xl p-6 hover:-translate-y-1 hover:shadow-lg transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl ${module.bg} flex items-center justify-center group-hover:opacity-80 transition-opacity`}
                  >
                    <module.icon className={`h-6 w-6 ${module.color}`} />
                  </div>
                  {module.count && (
                    <span className="bg-brand-gold text-brand-navy text-xs font-bold px-2 py-1 rounded-full min-w-[24px] text-center">
                      {module.count}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-brand-navy mb-1">
                  {module.title}
                </h3>
                <p className="text-sm text-gray-500">{module.description}</p>
              </Link>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mt-8 glass rounded-2xl p-6">
            <h3 className="font-bold text-brand-navy mb-4">
              Quick Actions
            </h3>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" size="sm">
                <CheckCircle className="h-4 w-4" />
                Approve Selected
              </Button>
              <Button variant="danger" size="sm">
                <XCircle className="h-4 w-4" />
                Reject Selected
              </Button>
              <Button variant="outline" size="sm">
                <BarChart3 className="h-4 w-4" />
                Export Report
              </Button>
              <Button variant="gold" size="sm">
                <Settings className="h-4 w-4" />
                Platform Settings
              </Button>
            </div>
          </div>
          </StaggerEntrance>
        </div>
      </main>
    </>
  );
}
