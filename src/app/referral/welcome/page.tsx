"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Sparkles, Gift, ArrowRight, CheckCircle2 } from "lucide-react";
import StaggerEntrance from "@/components/animations/StaggerEntrance";

function ReferralContent() {
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref") || "";

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 text-center py-16">
      <StaggerEntrance>
        <div className="w-16 h-16 rounded-3xl bg-brand-gold/10 text-brand-gold flex items-center justify-center mx-auto mb-6">
          <Gift className="h-8 w-8" />
        </div>

        <span className="px-4 py-1.5 bg-brand-gold/10 text-brand-gold text-xs font-bold rounded-full uppercase tracking-wider">
          Referral Reward Unlocked
        </span>

        <h1 className="text-3xl sm:text-4xl font-bold text-brand-navy font-display mt-4 mb-4">
          Welcome to DBMartNG!
        </h1>

        <p className="text-gray-600 text-lg leading-relaxed mb-8">
          You registered with referral code <span className="font-mono font-bold text-brand-navy">{refCode || "SPECIAL"}</span>.
          Enjoy full access to Nigeria&apos;s premier multivendor business directory!
        </p>

        <div className="glass rounded-3xl p-6 text-left space-y-3 mb-8 border border-brand-gold/20">
          <h3 className="font-bold text-brand-navy flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-gold" /> What you get:
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-accent-success" />
              Full 30-day trial for vendors with zero card required upfront
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-accent-success" />
              Direct WhatsApp messaging & verified business listings
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-accent-success" />
              Your referrer earns bonus trial rewards once your account activates
            </li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/browse">
            <Button variant="primary" size="lg" className="w-full sm:w-auto">
              Browse Directory
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="gold" size="lg" className="w-full sm:w-auto">
              Go to My Dashboard <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </StaggerEntrance>
    </div>
  );
}

export default function ReferralWelcomePage() {
  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen bg-surface-secondary">
        <Suspense fallback={<div className="text-center py-20">Loading referral info...</div>}>
          <ReferralContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
