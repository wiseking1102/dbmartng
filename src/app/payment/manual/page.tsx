"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

type ManualPaymentDetails = {
  amount: number;
  currency: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  existing: boolean;
  request_id: string | null;
  message?: string;
};

export default function ManualPaymentPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [details, setDetails] =
    useState<ManualPaymentDetails | null>(null);
  const [paymentReference, setPaymentReference] =
    useState("");

  const amount = details?.amount ?? 0;
  const bankName = details?.bank_name ?? "";
  const accountNumber = details?.account_number ?? "";
  const accountName = details?.account_name ?? "";

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/auth?redirect=/payment/manual");
        return;
      }

      if (cancelled) return;
      setUser(user);

      /*
       * The authoritative amount, bank details and request
       * state come from the server — never from URL
       * parameters, which the browser could manipulate.
       */
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
            method: "GET",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
              "Unable to load payment details."
          );
        }

        if (cancelled) return;

        setDetails({
          amount: result.amount,
          currency: result.currency || "NGN",
          bank_name: result.bank_name,
          account_number: result.account_number,
          account_name: result.account_name,
          existing: !!result.existing,
          request_id: result.request_id || null,
          message: result.message,
        });
      } catch (error: any) {
        if (cancelled) return;
        toast.error(
          error.message ||
            "Unable to load payment details."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const copyAccountNumber = async () => {
    await navigator.clipboard.writeText(accountNumber);
    toast.success("Account number copied");
  };

  const submitPayment = async () => {
    if (!user) {
      toast.error("Please sign in again.");
      return;
    }

    const reference = paymentReference.trim();

    if (reference.length < 4) {
      toast.error(
        "Enter the transfer reference or transaction ID from your OPay receipt."
      );
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();

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
            payment_reference: reference,
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

  if (loading || !user) {
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

            {details?.existing ? (
              <div className="mt-8 p-5 rounded-2xl bg-brand-gold/5 border border-brand-gold/20 text-center">
                <Clock className="h-8 w-8 mx-auto text-brand-gold" />

                <p className="mt-3 text-sm font-semibold text-brand-navy">
                  Payment request already awaiting review
                </p>

                <p className="text-xs text-gray-500 mt-2">
                  {details.message ||
                    "You already have a payment request that the admin team is reviewing."}
                </p>

                <Link
                  href="/dashboard/vendor/billing"
                  className="block mt-5"
                >
                  <Button variant="gold" size="lg">
                    Return to Billing
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="mt-8 p-5 rounded-2xl bg-gray-50 border border-gray-200">
                  <p className="text-sm text-gray-500">
                    Amount to pay
                  </p>

                  <p className="text-3xl font-bold text-brand-navy mt-1">
                    {amount > 0
                      ? formatNaira(amount)
                      : "—"}
                  </p>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="p-5 rounded-2xl border border-gray-200 bg-white">
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      Bank
                    </p>

                    <p className="font-semibold text-brand-navy mt-1">
                      {bankName || "—"}
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl border border-gray-200 bg-white">
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      Account Number
                    </p>

                    <div className="flex items-center justify-between gap-3 mt-1">
                      <p className="text-xl font-bold text-brand-navy tracking-wide">
                        {accountNumber || "—"}
                      </p>

                      {accountNumber ? (
                        <button
                          type="button"
                          onClick={copyAccountNumber}
                          className="p-2 rounded-lg hover:bg-gray-100"
                          aria-label="Copy account number"
                        >
                          <Copy className="h-5 w-5 text-brand-gold" />
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl border border-gray-200 bg-white">
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      Account Name
                    </p>

                    <p className="font-semibold text-brand-navy mt-1">
                      {accountName || "—"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-2xl bg-brand-gold/5 border border-brand-gold/20">
                  <p className="text-sm text-brand-navy font-semibold">
                    Important
                  </p>

                  <p className="text-xs text-gray-500 mt-1">
                    After transferring exactly{" "}
                    {amount > 0
                      ? formatNaira(amount)
                      : "the amount shown above"}
                    , enter your transfer reference below
                    and submit. An admin will verify the
                    payment before your Pro subscription is
                    activated.
                  </p>
                </div>

                <div className="mt-6">
                  <label
                    htmlFor="payment_reference"
                    className="block text-sm font-medium text-brand-navy"
                  >
                    Transfer reference / transaction ID
                  </label>

                  <input
                    id="payment_reference"
                    type="text"
                    value={paymentReference}
                    onChange={(event) =>
                      setPaymentReference(
                        event.target.value
                      )
                    }
                    placeholder="e.g. 20260926123456789"
                    maxLength={255}
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-brand-navy placeholder:text-gray-400 focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/20"
                  />

                  <p className="mt-1 text-xs text-gray-400">
                    You'll find this on your OPay payment
                    receipt. It helps the admin verify your
                    transfer quickly.
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
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
