"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import StaggerEntrance from "@/components/animations/StaggerEntrance";
import { createClient } from "@/lib/supabase/client";
import { formatNaira } from "@/lib/utils";
import { toast } from "sonner";
import {
  CreditCard,
  CheckCircle,
  XCircle,
  ChevronLeft,
  Calendar,
  Shield,
  Clock,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Loader2,
} from "lucide-react";

export default function BillingPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [vendorProfile, setVendorProfile] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || role !== "vendor")) {
      router.push("/auth?type=vendor");
    }
  }, [user, role, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      // Get vendor profile
      const { data: profile } = await supabase
        .from("vendor_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profile) setVendorProfile(profile);

      // Get active subscription
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("tier", "pro")
        .maybeSingle();

      if (sub) setSubscription(sub);
      setLoading(false);
    };

    fetchData();
  }, [user, supabase]);

  const handleSubscribe = async () => {
    if (!user || !vendorProfile) return;

    setCheckoutLoading(true);
    try {
      const response = await fetch("/api/paystack/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          email: user.email || vendorProfile.email,
          price: 5000,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      // Redirect to Paystack checkout
      window.location.href = result.data.authorization_url;
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleTrialDecision = async (decision: "pro" | "free") => {
    if (!user) return;

    try {
      const response = await fetch("/api/paystack/trial-decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, decision }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to save decision");

      if (decision === "pro") {
        handleSubscribe();
      } else {
        setVendorProfile((prev: any) => ({
          ...prev,
          trial_decision_made: true,
          trial_decision: "free",
          subscription_status: "free",
        }));
        toast.success("You're now on the Free tier. You can upgrade anytime.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    }
  };

  const handleReSync = async () => {
    if (!user) return;
    try {
      const response = await fetch("/api/paystack/subscription", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast.success("Subscription synced with Paystack");
      // Refresh data
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Failed to sync");
    }
  };

  if (authLoading || loading) {
    return (
      <>
        <Header />
        <div className="pt-20 min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
        </div>
      </>
    );
  }

  const trialEndDate = vendorProfile?.trial_ends_at
    ? new Date(vendorProfile.trial_ends_at)
    : null;
  const trialDaysLeft = trialEndDate
    ? Math.max(0, Math.ceil((trialEndDate.getTime() - Date.now()) / 86400000))
    : 0;
  const isTrialExpired = trialDaysLeft <= 0;

  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen bg-surface-secondary">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
          <StaggerEntrance>
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <Link
              href="/dashboard/vendor"
              className="text-gray-400 hover:text-brand-navy"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-brand-navy font-display">
                Billing & Subscription
              </h1>
              <p className="text-sm text-gray-500">
                Manage your plan and payment details
              </p>
            </div>
          </div>

          {/* Current Plan Card */}
          <div className="glass rounded-2xl p-6 sm:p-8 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-brand-navy mb-1">
                  Current Plan
                </h2>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
                      vendorProfile?.subscription_status === "pro"
                        ? "bg-accent-success/10 text-accent-success"
                        : vendorProfile?.subscription_status === "trial"
                          ? "bg-brand-gold/10 text-brand-gold"
                          : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {vendorProfile?.subscription_status === "pro"
                      ? "Pro"
                      : vendorProfile?.subscription_status === "trial"
                        ? "Trial"
                        : vendorProfile?.subscription_status === "payment_failed"
                          ? "Payment Failed"
                          : "Free"}
                  </span>
                  {vendorProfile?.subscription_status === "pro" && (
                    <span className="text-xs text-gray-400">
                      {subscription?.status === "past_due"
                        ? "(Past Due)"
                        : subscription?.status === "payment_failed"
                          ? "(Payment Issue)"
                          : "(Active)"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Trial Status */}
              {(vendorProfile?.subscription_status === "trial" ||
                vendorProfile?.subscription_status === "free") && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-brand-gold/5 border border-brand-gold/10">
                  <Clock className="h-5 w-5 text-brand-gold shrink-0" />
                  <div className="text-sm">
                    {isTrialExpired ? (
                      <span className="font-medium text-accent-error">
                        Your trial has ended.
                      </span>
                    ) : (
                      <span>
                        <span className="font-semibold text-brand-navy">
                          {trialDaysLeft} days
                        </span>{" "}
                        remaining in your free trial.
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Failed Alert */}
              {vendorProfile?.subscription_status === "payment_failed" && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-accent-error/5 border border-accent-error/10">
                  <AlertTriangle className="h-5 w-5 text-accent-error shrink-0" />
                  <div className="text-sm text-accent-error">
                    <span className="font-semibold">Payment failed.</span> Your
                    subscription is on hold. Please update your payment method.
                  </div>
                </div>
              )}

              {/* Pro Subscription Info */}
              {subscription && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-accent-success/5 border border-accent-success/10">
                  <CreditCard className="h-5 w-5 text-accent-success shrink-0" />
                  <div className="text-sm">
                    <span className="font-semibold text-brand-navy">
                      {formatNaira(subscription.price_paid)}/month
                    </span>
                    <span className="text-gray-500">
                      {" "}— Next payment:{" "}
                      {subscription.current_period_end
                        ? new Date(
                            subscription.current_period_end
                          ).toLocaleDateString()
                        : "N/A"}
                    </span>
                  </div>
                </div>
              )}

              {/* Features */}
              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                {(vendorProfile?.subscription_status === "pro" ||
                  vendorProfile?.subscription_status === "trial") && (
                  <>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-accent-success" />
                      Unlimited listings
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-accent-success" />
                      Full analytics dashboard
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-accent-success" />
                      In-site messaging
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-accent-success" />
                      Ad & sponsorship eligibility
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Trial Expiry Decision Screen */}
          {vendorProfile?.subscription_status === "trial" &&
            !vendorProfile?.trial_decision_made &&
            isTrialExpired && (
              <div className="glass rounded-2xl p-6 sm:p-8 mb-6 border-2 border-brand-gold animate-fade-in">
                <div className="text-center mb-6">
                  <Sparkles className="h-10 w-10 text-brand-gold mx-auto mb-3" />
                  <h2 className="text-xl font-bold text-brand-navy font-display mb-2">
                    Your Trial Has Ended
                  </h2>
                  <p className="text-gray-500">
                    Choose how you&apos;d like to continue using DBMartNG.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => handleTrialDecision("free")}
                    className="glass rounded-2xl p-6 text-left hover:-translate-y-1 hover:shadow-lg transition-all border-2 border-gray-100"
                  >
                    <h3 className="font-bold text-brand-navy text-lg mb-2">
                      Continue Free
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Up to 5 listings, basic profile, no analytics, no ads.
                    </p>
                    <ul className="space-y-2">
                      {[
                        "Up to 5 product/service listings",
                        "Basic business profile",
                        "Public search visibility",
                        "Contact via phone/email",
                      ].map((f) => (
                        <li
                          key={f}
                          className="flex items-center gap-2 text-sm text-gray-600"
                        >
                          <CheckCircle className="h-4 w-4 text-accent-success shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </button>

                  <button
                    onClick={() => handleTrialDecision("pro")}
                    className="glass rounded-2xl p-6 text-left hover:-translate-y-1 hover:shadow-lg transition-all border-2 border-brand-gold relative"
                  >
                    <div className="absolute -top-3 -right-3 bg-brand-gold text-brand-navy text-xs font-bold px-3 py-1 rounded-full">
                      Recommended
                    </div>
                    <h3 className="font-bold text-brand-navy text-lg mb-1">
                      Continue Pro
                    </h3>
                    <p className="text-2xl font-bold text-brand-gold mb-4">
                      {formatNaira(5000)}
                      <span className="text-sm text-gray-400 font-normal">
                        /month
                      </span>
                    </p>
                    <ul className="space-y-2">
                      {[
                        "Unlimited listings",
                        "Full analytics dashboard",
                        "In-site messaging inbox",
                        "Ad & sponsorship eligibility",
                        "Priority support",
                      ].map((f) => (
                        <li
                          key={f}
                          className="flex items-center gap-2 text-sm text-gray-600"
                        >
                          <CheckCircle className="h-4 w-4 text-accent-success shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                </div>
              </div>
            )}

          {/* Actions */}
          <div className="glass rounded-2xl p-6">
            <h3 className="font-bold text-brand-navy mb-4">Actions</h3>
            <div className="flex flex-wrap gap-3">
              {(vendorProfile?.subscription_status === "free" ||
                vendorProfile?.subscription_status === "trial") && (
                <Button
                  variant="gold"
                  size="lg"
                  onClick={handleSubscribe}
                  loading={checkoutLoading}
                >
                  <CreditCard className="h-4 w-4" />
                  Subscribe to Pro — {formatNaira(5000)}/month
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}

              {subscription && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleReSync}
                >
                  <Shield className="h-4 w-4" />
                  Sync with Paystack
                </Button>
              )}

              <Link href="/pricing">
                <Button variant="ghost" size="lg">
                  View Pricing Details
                </Button>
              </Link>
            </div>
          </div>

          {/* Payment Info */}
          <div className="mt-6 p-4 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-xs text-gray-400">
              Payments are processed securely by Paystack. All major Nigerian
              payment methods accepted: cards, bank transfers, USSD, mobile
              money (OPay, PalmPay, Kuda), and QR payments. Your subscription
              automatically renews monthly unless cancelled. You can cancel
              anytime — your access continues until the end of the current
              billing period.
            </p>
          </div>
          </StaggerEntrance>
        </div>
      </main>
    </>
  );
}
