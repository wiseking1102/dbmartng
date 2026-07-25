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
  MessageSquare,
  BarChart3,
  CreditCard,
  LogOut,
  Plus,
  TrendingUp,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
} from "lucide-react";

interface VendorStats {
  profileViews: number;
  listingViews: number;
  totalListings: number;
  messagesUnread: number;
  subscriptionStatus: string;
  trialEndsAt: string | null;
}

export default function VendorDashboardPage() {
  const { user, role, loading, signOut } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<VendorStats | null>(null);

  useEffect(() => {
    if (!loading && (!user || (role !== "vendor" && role !== "admin" && role !== "sub_admin"))) {
      router.push("/auth");
    }
  }, [user, role, loading, router]);

  useEffect(() => {
    if (user && (role === "vendor" || role === "admin")) {
      fetch("/api/vendor/stats")
        .then((r) => r.json())
        .then((json) => {
          if (json.success) setStats(json.data);
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
            Loading vendor dashboard...
          </div>
        </div>
      </>
    );
  }

  const quickActions = [
    {
      title: "My Listings",
      description: "Manage your products & services",
      icon: Package,
      href: "/dashboard/vendor/listings",
      count: stats?.totalListings ?? 0,
    },
    {
      title: "Messages",
      description: "Buyer conversations",
      icon: MessageSquare,
      href: "/dashboard/vendor/messages",
      count: stats?.messagesUnread ?? 0,
    },
    {
      title: "Analytics",
      description: "Profile views & performance",
      icon: BarChart3,
      href: "/dashboard/vendor/analytics",
      count: 0,
    },
    {
      title: "Subscription",
      description: "Manage your plan & billing",
      icon: CreditCard,
      href: "/dashboard/vendor/subscription",
      count: 0,
    },
  ];

  const isTrial = stats?.subscriptionStatus === "trial";
  const isFree = stats?.subscriptionStatus === "free";

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
                  Vendor Dashboard
                </h1>
                <p className="text-gray-500">
                  Manage your business profile, listings, and performance
                </p>
              </div>
              <div className="flex gap-3">
                <Link href="/dashboard/vendor/listings/new">
                  <Button variant="primary" size="sm">
                    <Plus className="h-4 w-4" />
                    Add Listing
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="outline" size="sm">
                    <Store className="h-4 w-4" />
                    View Public Profile
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={signOut}>
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </div>

            {/* Trial / Subscription Alert */}
            {(isTrial || isFree) && (
              <div className={`mb-6 p-4 rounded-2xl border ${
                isTrial 
                  ? "bg-amber-50 border-amber-200" 
                  : "bg-blue-50 border-blue-200"
              }`}>
                <div className="flex items-center gap-3">
                  {isTrial ? (
                    <Clock className="h-5 w-5 text-amber-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-blue-600" />
                  )}
                  <div className="flex-1">
                    <p className={`font-semibold ${isTrial ? "text-amber-800" : "text-blue-800"}`}>
                      {isTrial 
                        ? "Your free trial is active" 
                        : "You're on the Free plan"}
                    </p>
                    <p className={`text-sm ${isTrial ? "text-amber-600" : "text-blue-600"}`}>
                      {isTrial && stats?.trialEndsAt
                        ? `Trial ends ${new Date(stats.trialEndsAt).toLocaleDateString("en-NG")}. Upgrade to Pro for unlimited listings.`
                        : "Upgrade to Pro to unlock unlimited listings, analytics, and featured placement."}
                    </p>
                  </div>
                  <Link href="/dashboard/vendor/subscription">
                    <Button variant={isTrial ? "gold" : "primary"} size="sm">
                      {isTrial ? "Upgrade to Pro" : "Go Pro"}
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <Eye className="h-5 w-5 text-brand-gold" />
                </div>
                <div className="text-2xl font-bold text-brand-navy">
                  {stats?.profileViews?.toLocaleString() ?? "—"}
                </div>
                <div className="text-sm text-gray-500">Profile Views</div>
              </div>
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <TrendingUp className="h-5 w-5 text-brand-gold" />
                </div>
                <div className="text-2xl font-bold text-brand-navy">
                  {stats?.listingViews?.toLocaleString() ?? "—"}
                </div>
                <div className="text-sm text-gray-500">Listing Views</div>
              </div>
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <Package className="h-5 w-5 text-brand-gold" />
                </div>
                <div className="text-2xl font-bold text-brand-navy">
                  {stats?.totalListings?.toLocaleString() ?? "—"}
                </div>
                <div className="text-sm text-gray-500">Active Listings</div>
              </div>
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <CheckCircle className="h-5 w-5 text-brand-gold" />
                </div>
                <div className="text-2xl font-bold text-brand-navy">
                  {stats?.subscriptionStatus 
                    ? stats.subscriptionStatus.charAt(0).toUpperCase() + stats.subscriptionStatus.slice(1)
                    : "—"}
                </div>
                <div className="text-sm text-gray-500">Plan Status</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {quickActions.map((action) => (
                <Link
                  key={action.title}
                  href={action.href}
                  className="glass rounded-2xl p-6 hover:-translate-y-1 hover:shadow-lg transition-all group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-navy/5 flex items-center justify-center group-hover:bg-brand-navy/10 transition-colors">
                      <action.icon className="h-6 w-6 text-brand-navy" />
                    </div>
                    {action.count > 0 && (
                      <span className="bg-brand-gold text-brand-navy text-xs font-bold px-2 py-1 rounded-full">
                        {action.count}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-brand-navy mb-1">
                    {action.title}
                  </h3>
                  <p className="text-sm text-gray-500">{action.description}</p>
                </Link>
              ))}
            </div>

            {/* Profile Completion CTA */}
            <div className="glass rounded-2xl p-8 text-center bg-gradient-to-br from-brand-navy/5 to-brand-gold/5">
              <h2 className="text-xl sm:text-2xl font-bold text-brand-navy font-display mb-3">
                Complete Your Profile
              </h2>
              <p className="text-gray-600 mb-6 max-w-lg mx-auto">
                A complete profile gets 3x more views. Add your logo, cover image, business hours, and social links.
              </p>
              <Link href="/dashboard/vendor/settings">
                <Button variant="primary" size="lg">
                  <Settings className="h-5 w-5" />
                  Edit Profile
                </Button>
              </Link>
            </div>
          </StaggerEntrance>
        </div>
      </main>
    </>
  );
}
