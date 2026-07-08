"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import StaggerEntrance from "@/components/animations/StaggerEntrance";
import { createClient } from "@/lib/supabase/client";
import { formatNaira } from "@/lib/utils";
import {
  Package,
  MessageSquare,
  TrendingUp,
  Plus,
  Eye,
  Phone,
  Star,
  Settings,
  LogOut,
  CreditCard,
  Megaphone,
  Store,
  Clock,
  Users,
  Gift,
} from "lucide-react";
import { ReferralShareModal } from "@/components/engagement/ReferralShareModal";
import { ReferralShareCard } from "@/components/engagement/ReferralShareCard";

export default function VendorDashboardPage() {
  const { user, role, loading, signOut } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [vendorProfile, setVendorProfile] = useState<any>(null);
  const [showReferral, setShowReferral] = useState(false);
  const [referralStats, setReferralStats] = useState({ total: 0, converted: 0, rewarded: 0 });

  useEffect(() => {
    if (!loading && (!user || role !== "vendor")) {
      router.push("/auth?type=vendor");
    }
  }, [user, role, loading, router]);

  useEffect(() => {
    if (user) {
      supabase
        .from("vendor_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data) setVendorProfile(data);
        });

      // Fetch referral stats
      fetch("/api/referrals?type=sent")
        .then((res) => res.json())
        .then((statsData) => {
          if (statsData.stats) {
            const rewarded = (statsData.data || []).filter(
              (r: any) => r.status === "rewarded"
            ).length;
            setReferralStats({
              total: statsData.stats.total,
              converted: statsData.stats.converted,
              rewarded,
            });
          }
        })
        .catch(() => {});
    }
  }, [user, supabase]);

  if (loading || !vendorProfile) {
    return (
      <>
        <Header />
        <div className="pt-20 min-h-screen flex items-center justify-center">
          <div className="animate-pulse-soft text-brand-navy font-semibold">Loading dashboard...</div>
        </div>
      </>
    );
  }

  const stats = [
    { label: "Profile Views", value: "1,234", icon: Eye, change: "+12%" },
    { label: "Listing Views", value: "3,567", icon: TrendingUp, change: "+8%" },
    { label: "Messages", value: "45", icon: MessageSquare, change: "+23%" },
    { label: "WhatsApp Clicks", value: "89", icon: Phone, change: "+15%" },
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
                Vendor Dashboard
              </h1>
              <p className="text-gray-500">
                Welcome back, {vendorProfile.business_name || "Vendor"}
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={() => setShowReferral(true)}>
                <Gift className="h-4 w-4" />
                Refer & Earn
              </Button>
              <Link href={`/vendors/${vendorProfile.slug}`}>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4" />
                  View Profile
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>

          {/* Subscription Banner */}
          {vendorProfile.subscription_status === "trial" && (
            <div className="glass border-l-4 border-brand-gold rounded-2xl p-6 mb-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-brand-navy">
                    Free Trial Active
                  </h3>
                  <p className="text-sm text-gray-500">
                    Your 30-day full-access trial ends on{" "}
                    {new Date(
                      vendorProfile.trial_ends_at
                    ).toLocaleDateString()}
                    . Subscribe to Pro to keep full access.
                  </p>
                </div>
                <Link href="/pricing">
                  <Button variant="gold" size="sm">
                    <CreditCard className="h-4 w-4" />
                    Subscribe Now
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Referral Share Card */}
          <ReferralShareCard
            referrerType="vendor"
            stats={referralStats}
            showPending={false}
          />

          {/* Stats Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => (
              <div key={stat.label} className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <stat.icon className="h-5 w-5 text-brand-gold" />
                  <span className="text-xs font-semibold text-accent-success">
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

          {/* Quick Actions */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Link
              href="/dashboard/vendor/listings"
              className="glass rounded-2xl p-6 hover:-translate-y-1 hover:shadow-lg transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-brand-gold/10 flex items-center justify-center mb-4 group-hover:bg-brand-gold/20 transition-colors">
                <Package className="h-6 w-6 text-brand-gold" />
              </div>
              <h3 className="font-bold text-brand-navy mb-1">Manage Listings</h3>
              <p className="text-sm text-gray-500">
                Add, edit, or remove products and services
              </p>
            </Link>

            <Link
              href="/dashboard/vendor/messages"
              className="glass rounded-2xl p-6 hover:-translate-y-1 hover:shadow-lg transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-brand-navy/5 flex items-center justify-center mb-4 group-hover:bg-brand-navy/10 transition-colors">
                <MessageSquare className="h-6 w-6 text-brand-navy" />
              </div>
              <h3 className="font-bold text-brand-navy mb-1">Messages</h3>
              <p className="text-sm text-gray-500">
                View and reply to buyer inquiries
              </p>
            </Link>

            <Link
              href="/dashboard/vendor/promotions"
              className="glass rounded-2xl p-6 hover:-translate-y-1 hover:shadow-lg transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-brand-gold/10 flex items-center justify-center mb-4 group-hover:bg-brand-gold/20 transition-colors">
                <Megaphone className="h-6 w-6 text-brand-gold" />
              </div>
              <h3 className="font-bold text-brand-navy mb-1">Promotions</h3>
              <p className="text-sm text-gray-500">
                Run ads and sponsored listings
              </p>
            </Link>
          </div>

          {/* Recent Activity & Profile */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Recent Messages */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold text-brand-navy mb-4">
                Recent Messages
              </h3>
              <div className="text-center py-8 text-gray-400">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs mt-1">
                  Messages from buyers will appear here
                </p>
              </div>
            </div>

            {/* Profile Summary */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-brand-navy">
                  Profile
                </h3>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                  Edit
                </Button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Store className="h-4 w-4 text-brand-gold shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-brand-navy">
                      {vendorProfile.business_name || "Not set"}
                    </p>
                    <p className="text-xs text-gray-400">Business name</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-brand-gold shrink-0" />
                  <div>
                    <p className="text-sm text-gray-600">
                      {vendorProfile.is_verified ? "Verified" : "Pending verification"}
                    </p>
                    <p className="text-xs text-gray-400">Status</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-brand-gold shrink-0" />
                  <div>
                    <p className="text-sm text-gray-600 capitalize">
                      {vendorProfile.subscription_status}
                    </p>
                    <p className="text-xs text-gray-400">Subscription</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </StaggerEntrance>
        </div>
      </main>

      {/* Referral Modal */}
      <ReferralShareModal
        isOpen={showReferral}
        onClose={() => setShowReferral(false)}
        userType="vendor"
      />
    </>
  );
}
