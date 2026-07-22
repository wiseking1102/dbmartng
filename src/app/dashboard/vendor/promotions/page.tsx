"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import StaggerEntrance from "@/components/animations/StaggerEntrance";
import {
  Megaphone,
  ChevronLeft,
  Loader2,
  Star,
  Zap,
  Image as ImageIcon,
  TrendingUp,
  Eye,
  MousePointer,
  Clock,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Calendar,
} from "lucide-react";

interface Campaign {
  id: string;
  type: "featured" | "sponsored" | "banner";
  status: "active" | "paused" | "ended" | "pending";
  start_date: string;
  end_date: string;
  impressions: number;
  clicks: number;
  spent: number;
  budget: number;
}

const PROMOTION_OPTIONS = [
  {
    type: "featured" as const,
    title: "Featured Listing",
    description:
      "Your business appears at the top of search results with a gold 'Featured' badge. Perfect for maximum visibility.",
    icon: Star,
    price: "₦5,000",
    period: "/week",
    features: [
      "Top placement in search results",
      "Gold 'Featured' badge on profile",
      "Priority in category listings",
      "Average 3x more profile views",
    ],
    color: "brand-gold",
    popular: true,
  },
  {
    type: "sponsored" as const,
    title: "Sponsored Placement",
    description:
      "Your listing appears in sponsored sections across the platform, including the homepage and related vendor pages.",
    icon: Zap,
    price: "₦10,000",
    period: "/week",
    features: [
      "Homepage sponsored section",
      "Related vendors sidebar",
      "Category page highlights",
      "Average 5x more impressions",
    ],
    color: "brand-navy",
    popular: false,
  },
  {
    type: "banner" as const,
    title: "Banner Ad",
    description:
      "A visual banner ad displayed on browse and category pages. Upload your own creative or use our design tools.",
    icon: ImageIcon,
    price: "₦25,000",
    period: "/week",
    features: [
      "Full-width banner on browse pages",
      "Custom image/creative support",
      "Click-through to your profile",
      "Highest visibility placement",
    ],
    color: "brand-gold",
    popular: false,
  },
];

const STATUS_CONFIG: Record<
  Campaign["status"],
  { label: string; color: string }
> = {
  active: {
    label: "Active",
    color: "text-accent-success bg-accent-success/10 border-accent-success/20",
  },
  paused: {
    label: "Paused",
    color: "text-accent-warning bg-accent-warning/10 border-accent-warning/20",
  },
  ended: {
    label: "Ended",
    color: "text-gray-500 bg-gray-100 border-gray-200",
  },
  pending: {
    label: "Pending Review",
    color: "text-accent-info bg-accent-info/10 border-accent-info/20",
  },
};

export default function VendorPromotionsPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || role !== "vendor")) {
      router.push("/auth?type=vendor");
    }
  }, [user, role, authLoading, router]);

  const fetchCampaigns = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch("/api/vendor/promotions");
      const data = await response.json();
      setCampaigns(data.data || []);
    } catch {
      // Silently handle — empty state will show
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchCampaigns();
  }, [user, fetchCampaigns]);

  const activeCampaigns = campaigns.filter((c) => c.status === "active");
  const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);

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
                href="/dashboard/vendor"
                className="text-gray-400 hover:text-brand-navy transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy font-display">
                  Promotions
                </h1>
                <p className="text-sm text-gray-500">
                  Boost your visibility with ads and sponsored listings.
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-brand-gold/10 flex items-center justify-center">
                  <Megaphone className="h-6 w-6 text-brand-gold" />
                </div>
              </div>
              <div className="text-2xl font-bold text-brand-navy">
                {activeCampaigns.length}
              </div>
              <div className="text-sm text-gray-500">Active Campaigns</div>
            </div>
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-brand-navy/5 flex items-center justify-center">
                  <Eye className="h-6 w-6 text-brand-navy" />
                </div>
              </div>
              <div className="text-2xl font-bold text-brand-navy">
                {totalImpressions.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Total Impressions</div>
            </div>
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-brand-gold/10 flex items-center justify-center">
                  <MousePointer className="h-6 w-6 text-brand-gold" />
                </div>
              </div>
              <div className="text-2xl font-bold text-brand-navy">
                {totalClicks.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Total Clicks</div>
            </div>
          </div>

          {/* Promotion Options */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-brand-navy mb-4">
              Available Promotions
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {PROMOTION_OPTIONS.map((promo) => (
                <div
                  key={promo.type}
                  className={`glass rounded-2xl p-6 relative hover:-translate-y-1 hover:shadow-lg transition-all ${
                    promo.popular ? "border-2 border-brand-gold" : ""
                  }`}
                >
                  {promo.popular && (
                    <div className="absolute -top-3 -right-3 bg-brand-gold text-brand-navy text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Popular
                    </div>
                  )}
                  <div
                    className={`w-12 h-12 rounded-xl bg-${promo.color}/10 flex items-center justify-center mb-4`}
                  >
                    <promo.icon className={`h-6 w-6 text-${promo.color}`} />
                  </div>
                  <h3 className="font-bold text-brand-navy text-lg mb-1">
                    {promo.title}
                  </h3>
                  <p className="text-2xl font-bold text-brand-gold mb-1">
                    {promo.price}
                    <span className="text-sm text-gray-400 font-normal">
                      {promo.period}
                    </span>
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    {promo.description}
                  </p>
                  <ul className="space-y-2 mb-6">
                    {promo.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-2 text-sm text-gray-600"
                      >
                        <CheckCircle className="h-4 w-4 text-accent-success shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={promo.popular ? "gold" : "outline"}
                    size="md"
                    className="w-full"
                  >
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Active Campaigns */}
          <div>
            <h2 className="text-lg font-bold text-brand-navy mb-4">
              Your Campaigns
            </h2>
            {loading ? (
              <div className="glass rounded-2xl p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand-gold mx-auto mb-4" />
                <p className="text-gray-500">Loading campaigns...</p>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <Megaphone className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-bold text-brand-navy mb-2 font-display">
                  No Active Campaigns
                </h3>
                <p className="text-gray-500 mb-2 max-w-sm mx-auto">
                  You haven&apos;t run any promotions yet. Choose a promotion
                  option above to start getting more visibility for your
                  business.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map((campaign) => {
                  const statusConfig = STATUS_CONFIG[campaign.status];
                  const promoOption = PROMOTION_OPTIONS.find(
                    (p) => p.type === campaign.type
                  );
                  const PromoIcon = promoOption?.icon || Megaphone;

                  return (
                    <div
                      key={campaign.id}
                      className="glass rounded-2xl p-5 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-brand-gold/10 flex items-center justify-center shrink-0">
                          <PromoIcon className="h-6 w-6 text-brand-gold" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-bold text-brand-navy">
                                {promoOption?.title || campaign.type}
                              </h3>
                              <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(
                                    campaign.start_date
                                  ).toLocaleDateString()}{" "}
                                  –{" "}
                                  {new Date(
                                    campaign.end_date
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}
                            >
                              {statusConfig.label}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-6 mt-4 text-sm">
                            <div>
                              <span className="text-gray-400">Impressions</span>
                              <p className="font-semibold text-brand-navy">
                                {campaign.impressions.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-400">Clicks</span>
                              <p className="font-semibold text-brand-navy">
                                {campaign.clicks.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-400">CTR</span>
                              <p className="font-semibold text-brand-navy">
                                {campaign.impressions > 0
                                  ? (
                                      (campaign.clicks / campaign.impressions) *
                                      100
                                    ).toFixed(1)
                                  : "0.0"}
                                %
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-400">Spent</span>
                              <p className="font-semibold text-brand-gold">
                                ₦{campaign.spent.toLocaleString()} / ₦
                                {campaign.budget.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Summary */}
                <div className="pt-2 text-center">
                  <p className="text-xs text-gray-400">
                    {campaigns.length} campaign
                    {campaigns.length === 1 ? "" : "s"} total
                  </p>
                </div>
              </div>
            )}
          </div>
          </StaggerEntrance>
        </div>
      </main>
    </>
  );
}
