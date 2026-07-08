"use client";

import { useState, useEffect } from "react";
import {
  Share2,
  Copy,
  Check,
  ExternalLink,
  Gift,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ReferralStatsGrid, type ReferralStats } from "./ReferralStatsGrid";

interface ReferralShareCardProps {
  referrerType: "buyer" | "vendor";
  stats: ReferralStats;
  showPending?: boolean;
  className?: string;
}

export function ReferralShareCard({
  referrerType,
  stats,
  showPending = true,
  className = "mb-8",
}: ReferralShareCardProps) {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Auto-fetch referral code on mount
  useEffect(() => {
    fetch("/api/referrals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate", referrer_type: referrerType }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.code) {
          setReferralCode(data.code);
        }
      })
      .catch(() => {});
  }, [referrerType]);

  const rewardText =
    referrerType === "vendor"
      ? "Get 1 month free Pro per referred vendor who subscribes"
      : "Earn ₦1,000 per friend who signs up";

  const handleCopy = async () => {
    if (!referralCode) return;
    try {
      const link = `${window.location.origin}/auth?ref=${referralCode}`;
      await navigator.clipboard.writeText(link);
      setCodeCopied(true);
      toast.success("Referral link copied to clipboard!");
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleGenerate = async () => {
    setCodeLoading(true);
    try {
      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", referrer_type: referrerType }),
      });
      const data = await res.json();
      if (data.success && data.code) {
        setReferralCode(data.code);
      }
    } catch {
      toast.error("Failed to get referral code");
    } finally {
      setCodeLoading(false);
    }
  };

  const handleWhatsApp = () => {
    if (!referralCode) return;
    const whatsappText =
      referrerType === "vendor"
        ? "Join DBMartNG as a vendor using my referral code"
        : "Join DBMartNG using my referral code";
    window.open(
      `https://wa.me/?text=${encodeURIComponent(
        `${whatsappText}: ${referralCode}\n${window.location.origin}/auth?ref=${referralCode}`
      )}`,
      "_blank"
    );
  };

  return (
    <div className={`glass rounded-2xl overflow-hidden ${className}`}>
      <div className="p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-brand-gold/10 flex items-center justify-center shrink-0">
            <Share2 className="h-5 w-5 text-brand-gold" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-brand-navy">
              Share Your Referral Link
            </p>
            <p className="text-xs text-gray-400 truncate">{rewardText}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {referralCode ? (
            <>
              <code className="hidden sm:inline-block text-sm font-bold tracking-wider text-brand-gold bg-brand-gold/5 px-3 py-1.5 rounded-lg border border-brand-gold/10">
                {referralCode}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-9 w-9"
                aria-label="Copy referral link"
              >
                {codeCopied ? (
                  <Check className="h-4 w-4 text-accent-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleWhatsApp}
                className="h-9 w-9"
                aria-label="Share on WhatsApp"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </>
          ) : codeLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" role="status" />
          ) : (
            <Button variant="outline" size="sm" onClick={handleGenerate}>
              <Gift className="h-4 w-4" />
              Get Your Link
            </Button>
          )}
        </div>
      </div>

      {stats.total > 0 && (
        <div className="border-t border-gray-100 px-5 py-3 bg-gray-50/50">
          <ReferralStatsGrid stats={stats} showPending={showPending} />
        </div>
      )}
    </div>
  );
}
