"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Copy,
  Check,
  Share2,
  Gift,
  Users,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReferralStatsGrid } from "@/components/engagement/ReferralStatsGrid";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ReferralShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  userType: "buyer" | "vendor";
}

interface ReferralStats {
  total: number;
  converted: number;
  pending: number;
  rewarded: number;
}

export function ReferralShareModal({ isOpen, onClose, userType }: ReferralShareModalProps) {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<ReferralStats>({
    total: 0,
    converted: 0,
    pending: 0,
    rewarded: 0,
  });

  const referralLink = referralCode
    ? `${window.location.origin}/auth?ref=${referralCode}`
    : "";

  const fetchReferralData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Get or create referral code
      const genResponse = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", referrer_type: userType }),
      });
      const genData = await genResponse.json();
      if (genData.success) {
        setReferralCode(genData.code);
      }

      // Get stats
      const statsResponse = await fetch("/api/referrals?type=sent");
      const statsData = await statsResponse.json();
      if (statsData.stats) {
        const rewarded = (statsData.data || []).filter(
          (r: any) => r.status === "rewarded"
        ).length;
        setStats({
          total: statsData.stats.total,
          converted: statsData.stats.converted,
          pending: statsData.stats.pending,
          rewarded,
        });
      }
    } catch {
      toast.error("Failed to load referral data");
    } finally {
      setLoading(false);
    }
  }, [user, userType]);

  useEffect(() => {
    if (isOpen) {
      fetchReferralData();
    }
  }, [isOpen, fetchReferralData]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Referral link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join DBMartNG",
          text: `Sign up on DBMartNG using my referral code: ${referralCode}`,
          url: referralLink,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopy();
    }
  };

  const rewardText =
    userType === "vendor"
      ? "Get 1 month free Pro when a referred vendor subscribes"
      : "Earn ₦1,000 credit when a referred friend signs up as a buyer";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0" onClick={onClose} />

          <motion.div
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-gold/10 flex items-center justify-center">
                  <Gift className="h-5 w-5 text-brand-gold" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-brand-navy font-display">
                    Refer & Earn
                  </h2>
                  <p className="text-xs text-gray-400">Share with friends</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {loading ? (
                <div className="py-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-gold mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Setting up your referral...</p>
                </div>
              ) : (
                <>
                  {/* Reward info */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-brand-gold/5 to-brand-navy/5 border border-brand-gold/10">
                    <div className="flex items-start gap-3">
                      <Gift className="h-5 w-5 text-brand-gold shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-brand-navy text-sm mb-1">
                          Your Reward
                        </h3>
                        <p className="text-xs text-gray-500">{rewardText}</p>
                      </div>
                    </div>
                  </div>

                  {/* Referral code */}
                  {referralCode && (
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">
                        Your referral code
                      </p>
                      <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-brand-navy text-white">
                        <span className="text-xl font-bold tracking-widest font-display">
                          {referralCode}
                        </span>
                        <button
                          onClick={handleCopy}
                          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        >
                          {copied ? (
                            <Check className="h-4 w-4 text-accent-success" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Share link */}
                  <div>
                    <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">
                      Share link
                    </p>
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <code className="flex-1 text-xs text-gray-600 truncate">
                        {referralLink}
                      </code>
                      <button
                        onClick={handleCopy}
                        className="p-2 rounded-lg text-gray-400 hover:text-brand-navy hover:bg-white transition-all shrink-0"
                        title="Copy link"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-accent-success" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Share buttons */}
                  <div className="flex gap-3">
                    <Button
                      variant="primary"
                      size="lg"
                      className="flex-1"
                      onClick={handleShare}
                    >
                      <Share2 className="h-4 w-4" />
                      Share Now
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => {
                        window.open(
                          `https://wa.me/?text=${encodeURIComponent(
                            `Join DBMartNG using my referral code: ${referralCode}\n${referralLink}`
                          )}`,
                          "_blank"
                        );
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                      WhatsApp
                    </Button>
                  </div>

                  {/* Stats */}
                  {stats.total > 0 && (
                    <div className="pt-4 border-t border-gray-100">
                      <ReferralStatsGrid
                        stats={stats}
                        showPending
                        showHeader
                        compact
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
