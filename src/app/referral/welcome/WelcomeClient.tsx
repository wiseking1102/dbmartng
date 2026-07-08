"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { WelcomeAnimations } from "./WelcomeAnimations";
import {
  Gift,
  Sparkles,
  ArrowRight,
  UserPlus,
  Store,
  HeartHandshake,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface ReferrerInfo {
  name: string;
  type: "buyer" | "vendor";
}

export function ReferralWelcomeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, role, loading: authLoading } = useAuth();

  const referralCode = searchParams.get("ref");
  const [referrer, setReferrer] = useState<ReferrerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Fetch referrer info on mount
  useEffect(() => {
    if (!referralCode) {
      setLoading(false);
      return;
    }

    const fetchReferrer = async () => {
      try {
        const res = await fetch(
          `/api/referrals/referrer-info?code=${encodeURIComponent(referralCode)}`
        );
        if (!res.ok) {
          // If it fails (e.g. code already consumed), that's okay
          return;
        }
        const data = await res.json();
        if (data.success && data.referrer) {
          setReferrer(data.referrer);
        }
      } catch {
        // Silently fail — we'll show a generic welcome
      } finally {
        setLoading(false);
      }
    };

    fetchReferrer();
  }, [referralCode]);

  // Trigger confetti during the entrance animation (~midpoint of GSAP timeline)
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    }
  }, [user, authLoading, router]);

  // Determine redirect destination
  const getDestination = () => {
    if (role === "vendor") return "/onboarding";
    return "/";
  };

  // Handle Continue click — play exit animation, then navigate
  const handleContinue = () => {
    if (isExiting) return; // Prevent double-click
    setIsExiting(true);
  };

  const handleExitComplete = useCallback(() => {
    router.push(getDestination());
  }, [router, role]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-navy via-brand-navy-dark to-[#041c3d]">
        <Loader2 className="h-8 w-8 text-brand-gold animate-spin" />
      </div>
    );
  }

  return (
    <WelcomeAnimations
      isExiting={isExiting}
      onExitComplete={handleExitComplete}
    >
    <div className="min-h-screen bg-gradient-to-br from-brand-navy via-brand-navy-dark to-[#041c3d] flex flex-col items-center justify-center relative overflow-hidden">
      {/* ─── Confetti Particles ─── */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: [
                  "#C9B037",
                  "#0B3C7B",
                  "#10b981",
                  "#f59e0b",
                  "#ef4444",
                  "#3b82f6",
                  "#b76e79",
                  "#ffffff",
                ][Math.floor(Math.random() * 8)],
                animationDelay: `${Math.random() * 0.8}s`,
                animationDuration: `${0.8 + Math.random() * 0.6}s`,
                transform: `scale(${0.5 + Math.random() * 0.5})`,
              }}
            />
          ))}
        </div>
      )}

      {/* ─── Background Pattern ─── */}
      <div className="absolute inset-0 opacity-[0.04]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 25%, rgba(201, 176, 55, 0.4) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(201, 176, 55, 0.3) 0%, transparent 50%)",
          }}
        />
      </div>

      {/* ─── Content ─── */}
      <div className="relative z-10 mx-auto max-w-lg px-4 sm:px-6 text-center">
        {/* Logo */}
        <Link href="/" className="welcome-logo inline-block mb-8 opacity-0">
          <Image
            src="/brand/logo-3d.png"
            alt="DBMartNG"
            width={80}
            height={80}
            className="mx-auto drop-shadow-2xl animate-float"
          />
        </Link>

        {/* Welcome Card */}
        <div className="welcome-card glass-strong rounded-3xl p-8 sm:p-10 mb-6 opacity-0">
          {/* Icon */}
          <div className="welcome-icon w-20 h-20 rounded-full bg-brand-gold/10 flex items-center justify-center mx-auto mb-6 opacity-0">
            {referrer ? (
              <HeartHandshake className="h-10 w-10 text-brand-gold" />
            ) : (
              <Gift className="h-10 w-10 text-brand-gold" />
            )}
          </div>

          {/* Title */}
          <h1 className="welcome-title text-3xl sm:text-4xl font-bold text-brand-navy font-display mb-3 opacity-0">
            Welcome to DBMartNG!
          </h1>

          {/* Referrer Message */}
          {loading ? (
            <div className="welcome-message mb-6 space-y-5 animate-pulse-soft opacity-0">
              {/* Name placeholder */}
              <div className="flex justify-center">
                <div className="h-5 w-64 rounded-md bg-gray-200" />
              </div>
              {/* Badge placeholder */}
              <div className="flex justify-center">
                <div className="h-7 w-40 rounded-full bg-gray-200" />
              </div>
            </div>
          ) : referrer ? (
            <div className="welcome-message mb-6 opacity-0">
              <p className="text-lg text-gray-600 mb-2">
                You were referred by{" "}
                <span className="font-bold text-brand-gold">
                  {referrer.name}
                </span>
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-sm text-brand-navy font-medium">
                <UserPlus className="h-3.5 w-3.5" />
                {referrer.type === "vendor"
                  ? "Referred by a Vendor"
                  : "Referred by a Buyer"}
              </div>
            </div>
          ) : (
            <p className="welcome-message text-lg text-gray-600 mb-6 opacity-0">
              You&apos;ve joined via a referral link! We&apos;re excited to have
              you here.
            </p>
          )}

          {/* Divider */}
          <div className="welcome-divider relative my-6 opacity-0">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 bg-white text-xs font-medium text-gray-400 uppercase tracking-wider">
                Get Started
              </span>
            </div>
          </div>

          {/* Next Steps */}
          <div className="welcome-steps space-y-3 text-left mb-8 opacity-0">
            {role === "vendor" ? (
              <>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-brand-gold/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Store className="h-3.5 w-3.5 text-brand-gold" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand-navy">
                      Set Up Your Business Profile
                    </p>
                    <p className="text-xs text-gray-500">
                      Tell customers about your business
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-brand-gold/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="h-3.5 w-3.5 text-brand-gold" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand-navy">
                      Start with a 30-Day Free Trial
                    </p>
                    <p className="text-xs text-gray-500">
                      Full Pro access — no card required
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-brand-gold/10 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-brand-gold" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand-navy">
                      Get Discovered by Buyers
                    </p>
                    <p className="text-xs text-gray-500">
                      Your profile will be visible across Nigeria
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-brand-gold/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Store className="h-3.5 w-3.5 text-brand-gold" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand-navy">
                      Browse Trusted Vendors
                    </p>
                    <p className="text-xs text-gray-500">
                      Discover verified businesses near you
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-brand-gold/10 flex items-center justify-center shrink-0 mt-0.5">
                    <HeartHandshake className="h-3.5 w-3.5 text-brand-gold" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand-navy">
                      Connect Directly
                    </p>
                    <p className="text-xs text-gray-500">
                      Message vendors or reach out on WhatsApp
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* CTA Button */}
          <div className="welcome-cta block opacity-0">
            <Button
              variant="gold"
              size="xl"
              className="w-full"
              onClick={handleContinue}
              disabled={isExiting}
            >
              {role === "vendor"
                ? "Set Up Your Business"
                : "Start Exploring"}
              {isExiting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ArrowRight className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Refer & Earn Teaser */}
        <div className="welcome-teaser glass rounded-2xl p-5 opacity-0">
          <div className="flex items-center gap-3">
            <Gift className="h-5 w-5 text-brand-gold shrink-0" />
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-brand-navy">
                Refer & Earn!
              </span>{" "}
              Invite your friends and earn rewards when they join DBMartNG.
            </p>
          </div>
        </div>
      </div>
    </div>
    </WelcomeAnimations>
  );
}
