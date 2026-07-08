"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import StaggerEntrance from "@/components/animations/StaggerEntrance";
import { usePageTransition } from "@/lib/motion/PageTransitionContext";
import {
  Heart,
  MessageSquare,
  Search,
  Clock,
  Settings,
  LogOut,
  Store,
  ArrowRight,
  Gift,
  TrendingUp,
  Users,
  Coins,
} from "lucide-react";
import { ReferralShareModal } from "@/components/engagement/ReferralShareModal";
import { ReferralShareCard } from "@/components/engagement/ReferralShareCard";
import { formatDistanceToNow } from "date-fns";

interface ReferralReward {
  id: string;
  referred_name: string;
  status: string;
  reward_granted: boolean;
  created_at: string;
}

export default function BuyerDashboardPage() {
  const { user, role, loading, signOut } = useAuth();
  const { playExit, isExiting } = usePageTransition();
  const router = useRouter();
  const [savedSearchCount, setSavedSearchCount] = useState(0);
  const [showReferral, setShowReferral] = useState(false);
  const [referralStats, setReferralStats] = useState({ total: 0, converted: 0, pending: 0, rewarded: 0 });
  const [rewardHistory, setRewardHistory] = useState<ReferralReward[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [searchesRes, referralsRes] = await Promise.all([
        fetch("/api/saved-searches"),
        fetch("/api/referrals?type=sent"),
      ]);
      
      const searchesData = await searchesRes.json();
      if (searchesData.data) setSavedSearchCount(searchesData.data.length);

      const referralsData = await referralsRes.json();
      if (referralsData.stats) {
        const rewarded = (referralsData.data || []).filter(
          (r: any) => r.status === "rewarded"
        ).length;
        setReferralStats({
          total: referralsData.stats.total,
          converted: referralsData.stats.converted,
          pending: referralsData.stats.pending,
          rewarded,
        });
        setRewardHistory((referralsData.data || []).filter((r: any) => r.status === "rewarded"));
      }
    };
    fetchData();
  }, [user]);

  useEffect(() => {
    if (!loading && (!user || role !== "buyer")) {
      router.push("/auth");
    }
  }, [user, role, loading, router]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="pt-20 min-h-screen flex items-center justify-center">
          <div className="animate-pulse-soft text-brand-navy font-semibold">
            Loading dashboard...
          </div>
        </div>
      </>
    );
  }

  const handleSignOut = useCallback(async () => {
    await playExit();
    signOut();
  }, [playExit, signOut]);

  const quickActions = [
    {
      title: "Saved Vendors",
      description: "View your favorite businesses",
      icon: Heart,
      href: "/dashboard/buyer/favorites",
      count: 0,
    },
    {
      title: "Messages",
      description: "Your conversations with vendors",
      icon: MessageSquare,
      href: "/dashboard/buyer/messages",
      count: 0,
    },
    {
      title: "Saved Searches",
      description: "Get notified when new matches appear",
      icon: Search,
      href: "/dashboard/buyer/searches",
      count: savedSearchCount,
    },
    {
      title: "Recently Viewed",
      description: "Vendors you've checked out",
      icon: Clock,
      href: "/dashboard/buyer/history",
      count: 0,
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
                My Account
              </h1>
              <p className="text-gray-500">
                Welcome back! Your saved vendors and messages at a glance.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={() => setShowReferral(true)}>
                <Gift className="h-4 w-4" />
                Refer & Earn
              </Button>
              <Link href="/browse">
                <Button variant="primary" size="sm">
                  <Store className="h-4 w-4" />
                  Browse Vendors
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut} disabled={isExiting}>
                <LogOut className="h-4 w-4" />
                {isExiting ? "Signing out..." : "Sign Out"}
              </Button>
            </div>
          </div>

          {/* Quick Actions Grid */}
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

          {/* Share Your Referral Link — always visible */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-brand-navy">
                Refer & Earn
              </h3>
              {referralStats.total > 0 && (
                <span className="text-sm text-gray-500">
                  {referralStats.total} referral{referralStats.total !== 1 ? "s" : ""} sent
                </span>
              )}
            </div>

            {/* Referral Share Card */}
            <ReferralShareCard
              referrerType="buyer"
              stats={referralStats}
              showPending
              className="mb-4"
            />

            {/* Credits Balance + Reward History — only when there are rewards */}
            {rewardHistory.length > 0 && (
              <>
                <div className="glass rounded-2xl p-6 mb-4 bg-gradient-to-r from-brand-gold/10 to-amber-50 border border-brand-gold/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-brand-gold flex items-center justify-center">
                        <Coins className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 font-medium">Your Credit Balance</p>
                        <p className="text-2xl font-bold text-brand-navy">
                          ₦{(referralStats.rewarded * 1000).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          ₦1,000 credit earned per referral
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-brand-navy">
                        {referralStats.rewarded} reward{referralStats.rewarded !== 1 ? "s" : ""} earned
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {referralStats.converted - referralStats.rewarded} pending
                      </p>
                    </div>
                  </div>
                </div>

                <div className="glass rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h4 className="font-semibold text-brand-navy text-sm">
                      Reward History
                    </h4>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {rewardHistory.map((reward) => (
                      <div
                        key={reward.id}
                        className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                            <Gift className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-brand-navy">
                              {reward.referred_name || "A friend"} signed up
                            </p>
                            <p className="text-xs text-gray-400">
                              {formatDistanceToNow(new Date(reward.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-green-600">
                          +₦1,000
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Browse CTA */}
          <div className="glass rounded-2xl p-8 text-center bg-gradient-to-br from-brand-navy/5 to-brand-gold/5">
            <h2 className="text-xl sm:text-2xl font-bold text-brand-navy font-display mb-3">
              Discover More Businesses
            </h2>
            <p className="text-gray-600 mb-6 max-w-lg mx-auto">
              Browse hundreds of verified vendors across Nigeria. Find exactly
              what you need.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/browse">
                <Button variant="gold" size="lg">
                  Browse All Vendors
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/browse?category=food">
                <Button variant="outline" size="lg">
                  Food & Beverages
                </Button>
              </Link>
              <Link href="/browse?category=fashion">
                <Button variant="outline" size="lg">
                  Fashion & Style
                </Button>
              </Link>
            </div>
          </div>

          {/* Recent Activity Placeholder */}
          <div className="mt-8">
            <h3 className="text-lg font-bold text-brand-navy mb-4">
              Recent Activity
            </h3>
            <div className="glass rounded-2xl p-8 text-center">
              <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">
                No recent activity yet. Start browsing vendors to see your
                history here.
              </p>
              <Link href="/browse">
                <Button variant="primary" size="sm" className="mt-4">
                  Start Browsing
                </Button>
              </Link>
            </div>
          </div>
          </StaggerEntrance>
        </div>
      </main>

      {/* Referral Modal */}
      <ReferralShareModal
        isOpen={showReferral}
        onClose={() => setShowReferral(false)}
        userType="buyer"
      />
    </>
  );
}
