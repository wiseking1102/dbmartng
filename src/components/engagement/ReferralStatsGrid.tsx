"use client";

import { TrendingUp } from "lucide-react";

export interface ReferralStats {
  total: number;
  converted: number;
  pending?: number;
  rewarded: number;
}

interface ReferralStatsGridProps {
  stats: ReferralStats;
  /** Show the pending column (default: true). Set to false for vendors. */
  showPending?: boolean;
  /** Show the "Your Referral Stats" header with TrendingUp icon (default: false). */
  showHeader?: boolean;
  /** Compact spacing variant for the modal (default: false). */
  compact?: boolean;
}

export function ReferralStatsGrid({
  stats,
  showPending = true,
  showHeader = false,
  compact = false,
}: ReferralStatsGridProps) {
  if (stats.total === 0) return null;

  return (
    <>
      {showHeader && (
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-brand-gold" />
          <span className="text-sm font-semibold text-brand-navy">
            Your Referral Stats
          </span>
        </div>
      )}

      <div
        className={`grid ${showPending ? "grid-cols-4" : "grid-cols-3"} ${
          compact ? "gap-3" : "gap-4"
        }`}
      >
        <div className="text-center">
          <div className="text-lg font-bold text-brand-navy">
            {stats.total}
          </div>
          <div className="text-xs text-gray-400">Total referred</div>
        </div>

        <div className="text-center">
          <div className="text-lg font-bold text-accent-success">
            {stats.converted}
          </div>
          <div className="text-xs text-gray-400">Converted</div>
        </div>

        {showPending && (
          <div className="text-center">
            <div className="text-lg font-bold text-accent-warning">
              {stats.pending ?? 0}
            </div>
            <div className="text-xs text-gray-400">Pending</div>
          </div>
        )}

        <div className="text-center">
          <div className="text-lg font-bold text-brand-gold">
            {stats.rewarded}
          </div>
          <div className="text-xs text-gray-400">Rewards earned</div>
        </div>
      </div>
    </>
  );
}
