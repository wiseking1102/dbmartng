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
  ChevronLeft,
  Shield,
  Clock,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Loader2,
} from "lucide-react";

const PRO_PRICE = 5000;

export default function BillingPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [vendorProfile, setVendorProfile] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || role !== "vendor")) {
      router.replace("/auth?type=vendor");
    }
  }, [user, role, authLoading, router]);

  useEffect(() => {
    if (authLoading || !user || role !== "vendor") {
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);

      try {
        const [profileResult, subscriptionResult] = await Promise.all([
          supabase
            .from("vendor_profiles")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle(),

          supabase
            .from("subscriptions")
            .select("*")
            .eq("user_id", user.id)
            .eq("tier", "pro")
            .maybeSingle(),
        ]);

        if (cancelled) return;

        if (profileResult.error) {
          console.error(
            "Failed to load vendor profile:",
            profileResult.error
          );
        }

        if (subscriptionResult.error) {
          console.error(
            "Failed to load subscription:",
            subscriptionResult.error
          );
        }

        setVendorProfile(profileResult.data ?? null);
        setSubscription(subscriptionResult.data ?? null);
      } catch (error) {
        console.error("Failed to load billing data:", error);

        if (!cancelled) {
          toast.error("Failed to load your billing information.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [user, role, authLoading, supabase]);

  /**
   * Gets the current Supabase access token.
   *
   * The server-side payment API authenticates the vendor using this token.
   * We intentionally do NOT trust a userId supplied by the browser.
   */
  const getAccessToken = async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Failed to get Supabase session:", error);
      return null;
    }

    return session?.access_token ?? null;
  };

  const handleSubscribe = async () => {
    if (!user || role !== "vendor" || !vendorProfile) {
      toast.error("Vendor account not ready.");
      return;
    }

    if (checkoutLoading) {
      return;
    }

    setCheckoutLoading(true);

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        toast.error("Your session has expired. Please sign in again.");
        router.replace("/auth?type=vendor");
        return;
      }

      const response = await fetch("/api/paystack/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email: user.email || vendorProfile.email || undefined,
          price: PRO_PRICE,
        }),
      });

      let result: any = null;

      try {
        result = await response.json();
      } catch {
        result = null;
      }

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            "Failed to start payment."
        );
      }

      /**
       * Paystack unavailable:
       *
       * The API intentionally returns a successful HTTP response with
       * fallback === "manual" when Paystack cannot be used.
       *
       * Do NOT treat this as a successful subscription.
       * Send the vendor to the manual OPay payment page instead.
       */
      if (result?.fallback === "manual") {
        const paymentUrl = result?.data?.payment_url;

        if (paymentUrl) {
          toast.info(
            "Paystack is currently unavailable. You can pay manually through OPay."
          );

          router.push(paymentUrl);
          return;
        }

        toast.error(
          "Online payment is unavailable and the manual payment page could not be opened."
        );
        return;
      }

      const authorizationUrl =
        result?.data?.authorization_url;

      if (!authorizationUrl) {
        throw new Error(
          "Paystack did not return a checkout URL."
        );
      }

      toast.success("Opening secure Paystack checkout...");

      window.location.href = authorizationUrl;
    } catch (error: any) {
      console.error("Subscription checkout error:", error);

      toast.error(
        error?.message ||
          "Unable to start checkout. Please try again."
      );
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleTrialDecision = async (
    decision: "pro" | "free"
  ) => {
    if (!user || role !== "vendor") {
      return;
    }

    if (decisionLoading) {
      return;
    }

    setDecisionLoading(true);

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        toast.error("Your session has expired. Please sign in again.");
        router.replace("/auth?type=vendor");
        return;
      }

      const response = await fetch("/api/paystack/trial-decision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          decision,
        }),
      });

      let result: any = null;

      try {
        result = await response.json();
      } catch {
        result = null;
      }

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            "Failed to save your decision."
        );
      }

      if (decision === "pro") {
        /**
         * Choosing Pro does NOT activate Pro.
         * It only starts the payment process.
         *
         * Actual activation must happen server-side after verified
         * Paystack payment or admin approval of a manual payment.
         */
        await handleSubscribe();
        return;
      }

      setVendorProfile((prev: any) => ({
        ...prev,
        trial_decision_made: true,
        trial_decision: "free",
        subscription_status: "free",
      }));

      toast.success(
        "You're now on the Free tier. You can upgrade anytime."
      );
    } catch (error: any) {
      console.error("Trial decision error:", error);

      toast.error(
        error?.message ||
          "Failed to update your subscription choice."
      );
    } finally {
      setDecisionLoading(false);
    }
  };

  const handleReSync = async () => {
    if (!user || role !== "vendor") {
      return;
    }

    if (syncLoading) {
      return;
    }

    setSyncLoading(true);

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        toast.error("Your session has expired. Please sign in again.");
        router.replace("/auth?type=vendor");
        return;
      }

      const response = await fetch("/api/paystack/subscription", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      let result: any = null;

      try {
        result = await response.json();
      } catch {
        result = null;
      }

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            "Failed to sync subscription."
        );
      }

      toast.success("Subscription synced with Paystack.");

      window.location.reload();
    } catch (error: any) {
      console.error("Subscription sync error:", error);

      toast.error(
        error?.message ||
          "Failed to sync your subscription."
      );
    } finally {
      setSyncLoading(false);
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

  if (!user || role !== "vendor") {
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
    ? Math.max(
        0,
        Math.ceil(
          (trialEndDate.getTime() - Date.now()) / 86400000
        )
      )
    : 0;

  const isTrialExpired = trialDaysLeft <= 0;

  const subscriptionStatus =
    vendorProfile?.subscription_status;

  const isPro = subscriptionStatus === "pro";
  const isTrial = subscriptionStatus === "trial";
  const isFree =
    subscriptionStatus === "free" ||
    !subscriptionStatus;

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
                className="text-gray-400 hover:text-brand-navy transition-colors"
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
                        isPro
                          ? "bg-accent-success/10 text-accent-success"
                          : isTrial
                            ? "bg-brand-gold/10 text-brand-gold"
                            : subscriptionStatus ===
                                "payment_failed"
                              ? "bg-accent-error/10 text-accent-error"
                              : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {isPro
                        ? "Pro"
                        : isTrial
                          ? "Trial"
                          : subscriptionStatus ===
                              "payment_failed"
                            ? "Payment Failed"
                            : "Free"}
                    </span>

                    {isPro && (
                      <span className="text-xs text-gray-400">
                        {subscription?.status === "past_due"
                          ? "(Past Due)"
                          : subscription?.status ===
                              "payment_failed"
                            ? "(Payment Issue)"
                            : subscription?.status ===
                                "pending"
                              ? "(Payment Pending)"
                              : "(Active)"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Trial Status */}
                {(isTrial || isFree) && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-brand-gold/5 border border-brand-gold/10">
                    <Clock className="h-5 w-5 text-brand-gold shrink-0" />

                    <div className="text-sm">
                      {isTrial && isTrialExpired ? (
                        <span className="font-medium text-accent-error">
                          Your trial has ended.
                        </span>
                      ) : isTrial ? (
                        <span>
                          <span className="font-semibold text-brand-navy">
                            {trialDaysLeft} days
                          </span>{" "}
                          remaining in your free trial.
                        </span>
                      ) : (
                        <span>
                          You're currently on the Free tier.
                          Upgrade to Pro whenever you're ready.
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Payment Failed Alert */}
                {subscriptionStatus === "payment_failed" && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-accent-error/5 border border-accent-error/10">
                    <AlertTriangle className="h-5 w-5 text-accent-error shrink-0" />

                    <div className="text-sm text-accent-error">
                      <span className="font-semibold">
                        Payment failed.
                      </span>{" "}
                      Your subscription is on hold. Please
                      update your payment method.
                    </div>
                  </div>
                )}

                {/* Pending Payment Alert */}
                {subscription?.status === "pending" && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-brand-gold/5 border border-brand-gold/10">
                    <Clock className="h-5 w-5 text-brand-gold shrink-0" />

                    <div className="text-sm text-gray-600">
                      <span className="font-semibold text-brand-navy">
                        Payment pending.
                      </span>{" "}
                      Your Pro access will only become active
                      after payment is verified.
                    </div>
                  </div>
                )}

                {/* Pro Subscription Info */}
                {subscription && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-accent-success/5 border border-accent-success/10">
                    <CreditCard className="h-5 w-5 text-accent-success shrink-0" />

                    <div className="text-sm">
                      <span className="font-semibold text-brand-navy">
                        {formatNaira(subscription.price_paid)}
                        /month
                      </span>

                      <span className="text-gray-500">
                        {" "}
                        • Next payment:{" "}
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
                  {(isPro || isTrial) && (
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

                  {isFree && (
                    <>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle className="h-4 w-4 text-accent-success" />
                        Up to 5 listings
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle className="h-4 w-4 text-accent-success" />
                        Basic business profile
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle className="h-4 w-4 text-accent-success" />
                        Public search visibility
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle className="h-4 w-4 text-accent-success" />
                        Contact via phone/email
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Trial Expiry Decision Screen */}
            {isTrial &&
              !vendorProfile?.trial_decision_made &&
              isTrialExpired && (
                <div className="glass rounded-2xl p-6 sm:p-8 mb-6 border-2 border-brand-gold animate-fade-in">
                  <div className="text-center mb-6">
                    <Sparkles className="h-10 w-10 text-brand-gold mx-auto mb-3" />

                    <h2 className="text-xl font-bold text-brand-navy font-display mb-2">
                      Your Trial Has Ended
                    </h2>

                    <p className="text-gray-500">
                      Choose how you'd like to continue using
                      DBMartNG.
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Free */}
                    <button
                      type="button"
                      onClick={() =>
                        handleTrialDecision("free")
                      }
                      disabled={decisionLoading}
                      className="glass rounded-2xl p-6 text-left hover:-translate-y-1 hover:shadow-lg transition-all border-2 border-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <h3 className="font-bold text-brand-navy text-lg mb-2">
                        Continue Free
                      </h3>

                      <p className="text-sm text-gray-500 mb-4">
                        Up to 5 listings, basic profile, no
                        analytics, no ads.
                      </p>

                      <ul className="space-y-2">
                        {[
                          "Up to 5 product/service listings",
                          "Basic business profile",
                          "Public search visibility",
                          "Contact via phone/email",
                        ].map((feature) => (
                          <li
                            key={feature}
                            className="flex items-center gap-2 text-sm text-gray-600"
                          >
                            <CheckCircle className="h-4 w-4 text-accent-success shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </button>

                    {/* Pro */}
                    <button
                      type="button"
                      onClick={() =>
                        handleTrialDecision("pro")
                      }
                      disabled={
                        decisionLoading || checkoutLoading
                      }
                      className="glass rounded-2xl p-6 text-left hover:-translate-y-1 hover:shadow-lg transition-all border-2 border-brand-gold relative disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <div className="absolute -top-3 -right-3 bg-brand-gold text-brand-navy text-xs font-bold px-3 py-1 rounded-full">
                        Recommended
                      </div>

                      <h3 className="font-bold text-brand-navy text-lg mb-1">
                        Continue Pro
                      </h3>

                      <p className="text-2xl font-bold text-brand-gold mb-4">
                        {formatNaira(PRO_PRICE)}

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
                        ].map((feature) => (
                          <li
                            key={feature}
                            className="flex items-center gap-2 text-sm text-gray-600"
                          >
                            <CheckCircle className="h-4 w-4 text-accent-success shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </button>
                  </div>
                </div>
              )}

            {/* Actions */}
            <div className="glass rounded-2xl p-6">
              <h3 className="font-bold text-brand-navy mb-4">
                Actions
              </h3>

              <div className="flex flex-wrap gap-3">
                {(isFree || isTrial) && (
                  <Button
                    variant="gold"
                    size="lg"
                    onClick={handleSubscribe}
                    loading={checkoutLoading}
                    disabled={checkoutLoading}
                  >
                    <CreditCard className="h-4 w-4" />

                    {checkoutLoading
                      ? "Opening Checkout..."
                      : `Subscribe to Pro — ${formatNaira(
                          PRO_PRICE
                        )}/month`}

                    {!checkoutLoading && (
                      <ArrowRight className="h-4 w-4" />
                    )}
                  </Button>
                )}

                {subscription &&
                  subscription.status !== "pending" && (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleReSync}
                      loading={syncLoading}
                      disabled={syncLoading}
                    >
                      <Shield className="h-4 w-4" />

                      {syncLoading
                        ? "Syncing..."
                        : "Sync with Paystack"}
                    </Button>
                  )}

                <Link href="/pricing">
                  <Button variant="ghost" size="lg">
                    View Pricing Details
                  </Button>
                </Link>
              </div>

              {/* Manual payment hint */}
              {(isFree || isTrial) && (
                <p className="mt-4 text-xs text-gray-400">
                  If Paystack is temporarily unavailable,
                  you'll automatically be given the option to
                  pay manually through OPay. Manual payments
                  require admin approval before Pro access is
                  activated.
                </p>
              )}
            </div>

            {/* Payment Info */}
            <div className="mt-6 p-4 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-400">
                Payments are processed securely by Paystack.
                Nigerian payment methods such as cards, bank
                transfers, USSD and supported mobile payment
                channels may be available. Your Pro
                subscription is only activated after the
                payment is verified server-side. Manual OPay
                payments require administrator approval before
                Pro access is granted.
              </p>
            </div>
          </StaggerEntrance>
        </div>
      </main>
    </>
  );
}