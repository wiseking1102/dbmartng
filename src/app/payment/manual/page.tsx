"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { formatNaira } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle,
  Copy,
  Loader2,
  ShieldCheck,
  Clock,
} from "lucide-react";

export default function ManualPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [user, setUser] = useState<any>(null);

  const amount = Number(searchParams.get("amount")) || 5000;

  const bankName = "OPay";
  const accountNumber = "6565411855";
  const accountName = "CHINEDU GOODLUCK OBASIOKOLO";

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/auth?redirect=/payment/manual");
        return;
      }

      setUser(user);
    };

    loadUser();
  }, [router, supabase]);

  const copyAccountNumber = async () => {
    await navigator.clipboard.writeText(accountNumber);
    toast.success("Account number copied");
  };

  const submitPayment = async () => {
    if (!user) {
      toast.error("Please sign in again.");
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      const response = await fetch(
        "/api/payments/manual",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            amount,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Failed to submit payment request"
        );
      }

      setSubmitted(true);

      toast.success(
        "Payment request submitted for admin review."
      );
    } catch (error: any) {
      toast.error(
        error.message ||
          "Unable to submit payment request."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
        </main>
      </>
    );
  }

  if (submitted) {
    return (
      <>
        <Header />

        <main className="min-h-screen bg-surface-secondary pt-24 px-4">
          <div className="mx-auto max-w-xl">
            <div className="glass rounded-3xl p-8 text-center">
              <CheckCircle className="h-16 w-16 mx-auto mb-5 text-accent-success" />

              <h1 className="text-2xl font-bold text-brand-navy">
                Payment Submitted
              </h1>

              <p className="mt-3 text-gray-500">
                Your manual payment request has been sent
                to the DBMartNG admin team.
              </p>

              <div className="mt-6 p-4 rounded-2xl bg-brand-gold/5 border border-brand-gold/20">
                <div className="flex items-center justify-center gap-2 text-sm font-semibold text-brand-navy">
                  <Clock className="h-4 w-4" />
                  Awaiting admin approval
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  Your Pro subscription will NOT activate
                  until the payment has been reviewed and
                  approved.
                </p>
              </div>

              <Link
                href="/dashboard/vendor/billing"
                className="block mt-6"
              >
                <Button variant="gold" size="lg">
                  Return to Billing
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-surface-secondary pt-24 px-4 pb-12">
        <div className="mx-auto max-w-xl">
          <Link
            href="/dashboard/vendor/billing"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-navy mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to billing
          </Link>

          <div className="glass rounded-3xl p-6 sm:p-8">
            <div className="text-center">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-brand-gold/10 flex items-center justify-center">
                <ShieldCheck className="h-7 w-7 text-brand-gold" />
              </div>

              <h1 className="text-2xl font-bold text-brand-navy mt-4">
                Complete Payment Manually
              </h1>

              <p className="text-gray-500 mt-2">
                Pay via OPay and submit your payment for
                admin verification.
              </p>
            </div>

            <div className="mt-8 p-5 rounded-2xl bg-gray-50 border border-gray-200">
              <p className="text-sm text-gray-500">
                Amount to pay
              </p>

              <p className="text-3xl font-bold text-brand-navy mt-1">
                {formatNaira(amount)}
              </p>
            </div>

            <div className="mt-5 space-y-4">
              <div className="p-5 rounded-2xl border border-gray-200 bg-white">
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Bank
                </p>

                <p className="font-semibold text-brand-navy mt-1">
                  {bankName}
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-gray-200 bg-white">
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Account Number
                </p>

                <div className="flex items-center justify-between gap-3 mt-1">
                  <p className="text-xl font-bold text-brand-navy tracking-wide">
                    {accountNumber}
                  </p>

                  <button
                    type="button"
                    onClick={copyAccountNumber}
                    className="p-2 rounded-lg hover:bg-gray-100"
                    aria-label="Copy account number"
                  >
                    <Copy className="h-5 w-5 text-brand-gold" />
                  </button>
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-gray-200 bg-white">
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Account Name
                </p>

                <p className="font-semibold text-brand-navy mt-1">
                  {accountName}
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-2xl bg-brand-gold/5 border border-brand-gold/20">
              <p className="text-sm text-brand-navy font-semibold">
                Important
              </p>

              <p className="text-xs text-gray-500 mt-1">
                After transferring exactly{" "}
                {formatNaira(amount)}, click the button
                below. An admin will verify the payment
                before your Pro subscription is activated.
              </p>
            </div>

            <Button
              variant="gold"
              size="lg"
              className="w-full mt-6"
              onClick={submitPayment}
              loading={submitting}
            >
              I've Made the Payment
            </Button>

            <p className="text-center text-xs text-gray-400 mt-4">
              Never send money to a different account unless
              DBMartNG officially updates these payment
              details.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}