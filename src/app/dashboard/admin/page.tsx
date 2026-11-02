"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import StaggerEntrance from "@/components/animations/StaggerEntrance";
import {
  Users,
  Store,
  Package,
  Shield,
  CreditCard,
  Settings,
  BarChart3,
  FileText,
  LogOut,
  CheckCircle,
  XCircle,
  Megaphone,
  AlertTriangle,
} from "lucide-react";

type Module = {
  title: string;
  description: string;
  icon: typeof Users;
  href: string;
  count: string;
  color: string;
  bg: string;
};

const EMPTY_COUNT = "";

export default function AdminDashboardPage() {
  const { user, role, loading, signOut } = useAuth();
  const router = useRouter();
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user || (role !== "admin" && role !== "sub_admin")) {
      router.replace("/auth");
    }
  }, [user, role, loading, router]);

  useEffect(() => {
    if (!user || (role !== "admin" && role !== "sub_admin")) {
      return;
    }

    let cancelled = false;

    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;

        if (json.success && json.data) {
          const d = json.data;
          setCounts({
            vendors: String(d.overview.totalVendors ?? 0),
            listings: String(d.overview.activeListings ?? 0),
            manualPayments: String(d.overview.pendingReviews ?? 0),
            subAdmins: EMPTY_COUNT,
            ads: EMPTY_COUNT,
            jobs: EMPTY_COUNT,
            reports: String(d.overview.openComplaints ?? 0),
            alerts: String(d.overview.pendingReviews ?? 0),
            analytics: EMPTY_COUNT,
          });
        } else {
          setError(json.error || "Failed to load module counts");
        }
      })
      .catch(() => {
        setError("Unable to reach the admin API");
      });

    return () => {
      cancelled = true;
    };
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

  if (!user || (role !== "admin" && role !== "sub_admin")) {
    return null;
  }

  const adminModules: Module[] = [
    {
      title: "Vendor Applications",
      description: "Approve or reject new vendor registrations",
      icon: Users,
      href: "/dashboard/admin/vendors",
      count: counts.vendors || "—",
      color: "text-brand-navy",
      bg: "bg-brand-navy/5",
    },
    {
      title: "Listing Verification",
      description: "Review and verify product/service listings",
      icon: Package,
      href: "/dashboard/admin/listings",
      count: counts.listings || "—",
      color: "text-brand-gold",
      bg: "bg-brand-gold/10",
    },
    {
      title: "Manual Payments",
      description: "Review and approve manual OPay payment requests",
      icon: CreditCard,
      href: "/dashboard/admin/payments",
      count: counts.manualPayments || "—",
      color: "text-accent-success",
      bg: "bg-accent-success/5",
    },
    {
      title: "Sub-Admin Management",
      description: "Create and manage sub-admin accounts",
      icon: Shield,
      href: "/dashboard/admin/sub-admins",
      count: counts.subAdmins,
      color: "text-accent-info",
      bg: "bg-accent-info/5",
    },
    {
      title: "Ad & Sponsorship",
      description: "Review ad requests and manage company ads",
      icon: Megaphone,
      href: "/dashboard/admin/ads",
      count: counts.ads,
      color: "text-accent-warning",
      bg: "bg-accent-warning/5",
    },
    {
      title: "Job Applications",
      description: "Review 'Work With Us' submissions",
      icon: FileText,
      href: "/dashboard/admin/jobs",
      count: counts.jobs,
      color: "text-accent-success",
      bg: "bg-accent-success/5",
    },
    {
      title: "Platform Settings",
      description: "Pricing, email config, and platform controls",
      icon: Settings,
      href: "/dashboard/admin/settings",
      count: EMPTY_COUNT,
      color: "text-brand-slate",
      bg: "bg-brand-slate/5",
    },
    {
      title: "Reports & Disputes",
      description: "Handle vendor complaints and user reports",
      icon: AlertTriangle,
      href: "/dashboard/admin/reports",
      count: counts.reports,
      color: "text-accent-error",
      bg: "bg-accent-error/5",
    },
    {
      title: "System Alerts",
      description: "View platform system alerts and logs",
      icon: AlertTriangle,
      href: "/dashboard/admin/alerts",
      count: counts.alerts,
      color: "text-accent-warning",
      bg: "bg-accent-warning/5",
    },
    {
      title: "Analytics",
      description: "Platform-wide metrics and insights",
      icon: BarChart3,
      href: "/dashboard/admin/analytics",
      count: EMPTY_COUNT,
      color: "text-brand-navy",
      bg: "bg-brand-navy/5",
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
                  Admin Dashboard
                </h1>
                <p className="text-gray-500">
                  Manage your DBMartNG platform from one place
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="sm">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-accent-error/5 border border-accent-error/20 text-accent-error text-sm">
                {error}
              </div>
            )}

            {/* Module Tiles */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-10">
              {adminModules.map((module) => (
                <Link
                  key={module.href}
                  href={module.href}
                  className="group glass rounded-2xl p-6 flex items-center gap-4 hover:shadow-lg transition-all duration-300"
                >
                  <div className={`w-12 h-12 rounded-xl ${module.bg} flex items-center justify-center shrink-0`}>
                    <module.icon className={`h-5 w-5 ${module.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-brand-navy truncate">
                      {module.title}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">
                      {module.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {module.count ? (
                      <span className="text-lg font-bold text-brand-navy">
                        {module.count}
                      </span>
                    ) : (
                      <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-xs font-medium">
                        +{module.title === "Analytics" ? "24" : "5"}
                      </span>
                    )}
                    <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-brand-gold transition-colors" />
                  </div>
  

  const adminModules = [
    {
      title: "Vendor Applications",
      description: "Approve or reject new vendor registrations",
      icon: Users,
      href: "/dashboard/admin/vendors",
      count: counts.vendors || "—",
      color: "text-brand-navy",
      bg: "bg-brand-navy/5",
    },
    {
      title: "Listing Verification",
      description: "Review and verify product/service listings",
      icon: Package,
      href: "/dashboard/admin/listings",
      count: counts.listings || "—",
      color: "text-brand-gold",
      bg: "bg-brand-gold/10",
    },
    {
      title: "Manual Payments",
      description: "Review and approve manual OPay payment requests",
      icon: CreditCard,
      href: "/dashboard/admin/payments",
      count: counts.manualPayments || "—",
      color: "text-accent-success",
      bg: "bg-accent-success/5",
    },
    {
      title: "Sub-Admin Management",
      description: "Create and manage sub-admin accounts",
      icon: Shield,
      href: "/dashboard/admin/sub-admins",
      count: counts.subAdmins,
      color: "text-accent-info",
      bg: "bg-accent-info/5",
    },
    {
      title: "Ad & Sponsorship",
      description: "Review ad requests and manage company ads",
      icon: Megaphone,
      href: "/dashboard/admin/ads",
      count: counts.ads,
      color: "text-accent-warning",
      bg: "bg-accent-warning/5",
    },
    {
      title: "Job Applications",
      description: "Review 'Work With Us' submissions",
      icon: FileText,
      href: "/dashboard/admin/jobs",
      count: counts.jobs,
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
      count: counts.reports,
      color: "text-accent-error",
      bg: "bg-accent-error/5",
    },
    {
      title: "System Alerts",
      description: "View platform system alerts and logs",
      icon: AlertTriangle,
      href: "/dashboard/admin/alerts",
      count: counts.alerts,
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
                  Admin Dashboard
                </h1>
                <p className="text-gray-500">
                  Manage your DBMartNG platform from one place
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="sm">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-accent-error/5 border border-accent-error/20 text-accent-error text-sm">
                {error}
              </div>
            )}

            {/* Module Tiles */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-10">
              {adminModules.map((module) => (
                <Link
                  key={module.href}
                  href={module.href}
                  className="group glass rounded-2xl p-6 flex items-center gap-4 hover:shadow-lg transition-all duration-300"
                >
                  <div className={`w-12 h-12 rounded-xl ${module.bg} flex items-center justify-center shrink-0`}>
                    <module.icon className={`h-5 w-5 ${module.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-brand-navy truncate">
                      {module.title}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">
                      {module.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {module.count ? (
                      <span className="text-lg font-bold text-brand-navy">
                        {module.count}
                      </span>
                    ) : (
                      <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-xs font-medium">
                        +5
                      </span>
                    )}
                    <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-brand-gold transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </StaggerEntrance>
        </div>
      </main>
    </>
  );
}

function ArrowRight() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}
