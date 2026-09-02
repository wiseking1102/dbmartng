"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { formatNaira } from "@/lib/utils";
import StaggerEntrance from "@/components/animations/StaggerEntrance";

import { toast } from "sonner";

import {
  ArrowLeft,
  CheckCircle,
  Clock,
  CreditCard,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  XCircle,
  AlertTriangle,
} from "lucide-react";

type PaymentStatus =
  | "pending"
  | "approved"
  | "rejected";

type PaymentRequest = {
  id: string;
  vendor_id: string;
  user_id: string;
  amount: number;
  currency: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  payment_reference: string | null;
  status: PaymentStatus;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;

  user: {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    role: string | null;
  } | null;

  vendor: {
    id: string;
    business_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
};

type FilterStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "all";

export default function AdminManualPaymentsPage() {
  const {
    user,
    role,
    loading: authLoading,
  } = useAuth();

  const router = useRouter();
  const supabase = createClient();

  const [payments, setPayments] = useState<
    PaymentRequest[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState<string | null>(null);

  const [filter, setFilter] =
    useState<FilterStatus>("pending");

  const [search, setSearch] =
    useState("");

  const [selectedPayment, setSelectedPayment] =
    useState<PaymentRequest | null>(null);

  const [adminNote, setAdminNote] =
    useState("");

  /*
   * Admin/sub-admin guard.
   */
  useEffect(() => {
    if (
      !authLoading &&
      (!user ||
        (role !== "admin" &&
          role !== "sub_admin"))
    ) {
      router.replace("/auth");
    }
  }, [
    user,
    role,
    authLoading,
    router,
  ]);

  const getAccessToken = useCallback(
    async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error(
          "Failed to get admin session:",
          error
        );

        return null;
      }

      return (
        session?.access_token || null
      );
    },
    [supabase]
  );

  const loadPayments = useCallback(
    async (
      requestedStatus: FilterStatus
    ) => {
      if (
        !user ||
        (role !== "admin" &&
          role !== "sub_admin")
      ) {
        return;
      }

      setLoading(true);

      try {
        const token =
          await getAccessToken();

        if (!token) {
          toast.error(
            "Your session has expired. Please sign in again."
          );

          router.replace("/auth");
          return;
        }

        const response = await fetch(
          `/api/admin/manual-payments?status=${encodeURIComponent(
            requestedStatus
          )}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

        let result: any = null;

        try {
          result = await response.json();
        } catch {
          result = null;
        }

        if (!response.ok) {
          throw new Error(
            result?.error ||
              "Failed to load manual payments."
          );
        }

        setPayments(
          Array.isArray(result?.data)
            ? result.data
            : []
        );
      } catch (error: any) {
        console.error(
          "Manual payment loading error:",
          error
        );

        toast.error(
          error?.message ||
            "Failed to load payment requests."
        );

        setPayments([]);
      } finally {
        setLoading(false);
      }
    },
    [
      user,
      role,
      getAccessToken,
      router,
    ]
  );

  useEffect(() => {
    if (
      authLoading ||
      !user ||
      (role !== "admin" &&
        role !== "sub_admin")
    ) {
      return;
    }

    loadPayments(filter);
  }, [
    authLoading,
    user,
    role,
    filter,
    loadPayments,
  ]);

  const handleAction = async (
    payment: PaymentRequest,
    action: "approve" | "reject"
  ) => {
    if (
      actionLoading ||
      payment.status !== "pending"
    ) {
      return;
    }

    const actionText =
      action === "approve"
        ? "approve this payment"
        : "reject this payment";

    const confirmed = window.confirm(
      `Are you sure you want to ${actionText}?\n\n` +
        `Vendor: ${
          payment.vendor?.business_name ||
          payment.user?.email ||
          "Unknown vendor"
        }\n` +
        `Amount: ${formatNaira(
          Number(payment.amount)
        )}`
    );

    if (!confirmed) {
      return;
    }

    setActionLoading(payment.id);

    try {
      const token =
        await getAccessToken();

      if (!token) {
        toast.error(
          "Your session has expired. Please sign in again."
        );

        router.replace("/auth");
        return;
      }

      const response = await fetch(
        "/api/admin/manual-payments",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            requestId: payment.id,
            action,
            adminNote:
              adminNote.trim() || undefined,
          }),
        }
      );

      let result: any = null;

      try {
        result = await response.json();
      } catch {
        result = null;
      }

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Failed to process payment."
        );
      }

      if (action === "approve") {
        if (
          result?.activated === false
        ) {
          toast.warning(
            result?.message ||
              "Payment approved, but Pro activation needs attention."
          );
        } else {
          toast.success(
            "Payment approved. Pro has been activated."
          );
        }
      } else {
        toast.success(
          "Manual payment rejected."
        );
      }

      setSelectedPayment(null);
      setAdminNote("");

      await loadPayments(filter);
    } catch (error: any) {
      console.error(
        "Manual payment action error:",
        error
      );

      toast.error(
        error?.message ||
          "Failed to process payment request."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const filteredPayments =
    useMemo(() => {
      const term =
        search.trim().toLowerCase();

      if (!term) {
        return payments;
      }

      return payments.filter(
        (payment) => {
          const values = [
            payment.id,
            payment.payment_reference,
            payment.user?.full_name,
            payment.user?.email,
            payment.user?.phone,
            payment.vendor?.business_name,
            payment.vendor?.email,
            payment.vendor?.phone,
          ];

          return values.some(
            (value) =>
              value
                ?.toLowerCase()
                .includes(term)
          );
        }
      );
    }, [payments, search]);

  const pendingCount =
    filter === "pending"
      ? payments.length
      : 0;

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

  if (
    !user ||
    (role !== "admin" &&
      role !== "sub_admin")
  ) {
    return null;
  }

  return (
    <>
      <Header />

      <main className="pt-20 min-h-screen bg-surface-secondary">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <StaggerEntrance>
            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div className="flex items-start gap-3">
                <Link
                  href="/dashboard/admin"
                  className="mt-1 text-gray-400 hover:text-brand-navy transition-colors"
                  aria-label="Back to admin dashboard"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Link>

                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy font-display">
                      Manual Payments
                    </h1>

                    {filter === "pending" &&
                      pendingCount > 0 && (
                        <span className="bg-brand-gold text-brand-navy text-xs font-bold px-2.5 py-1 rounded-full">
                          {pendingCount}
                        </span>
                      )}
                  </div>

                  <p className="text-gray-500 mt-1">
                    Review OPay payment requests
                    from vendors.
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  loadPayments(filter)
                }
                disabled={loading}
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    loading
                      ? "animate-spin"
                      : ""
                  }`}
                />
                Refresh
              </Button>
            </div>

            {/* Security notice */}
            <div className="glass rounded-2xl p-4 mb-6 border border-brand-gold/10">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-brand-gold mt-0.5 shrink-0" />

                <div className="text-sm text-gray-600">
                  <p className="font-semibold text-brand-navy mb-1">
                    Manual payment verification
                  </p>

                  <p>
                    Approve a request only after
                    confirming the OPay transfer.
                    Pro access is activated
                    server-side only after approval.
                  </p>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="glass rounded-2xl p-4 mb-6">
              <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      [
                        "pending",
                        "Pending",
                        Clock,
                      ],
                      [
                        "approved",
                        "Approved",
                        CheckCircle,
                      ],
                      [
                        "rejected",
                        "Rejected",
                        XCircle,
                      ],
                      [
                        "all",
                        "All",
                        CreditCard,
                      ],
                    ] as const
                  ).map(
                    ([
                      value,
                      label,
                      Icon,
                    ]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setFilter(value)
                        }
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                          filter === value
                            ? "bg-brand-navy text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </button>
                    )
                  )}
                </div>

                <div className="relative w-full lg:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value
                      )
                    }
                    placeholder="Search vendor or reference..."
                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand-gold"
                  />
                </div>
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <div className="glass rounded-2xl p-12 flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand-gold mb-3" />

                <p className="text-sm text-gray-500">
                  Loading payment requests...
                </p>
              </div>
            ) : filteredPayments.length ===
              0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <CreditCard className="h-10 w-10 text-gray-300 mx-auto mb-4" />

                <h2 className="font-bold text-brand-navy mb-1">
                  No payment requests
                </h2>

                <p className="text-sm text-gray-500">
                  {search
                    ? "No requests match your search."
                    : filter === "pending"
                      ? "There are no pending manual payments."
                      : `There are no ${filter} manual payments.`}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPayments.map(
                  (payment) => {
                    const vendorName =
                      payment.vendor
                        ?.business_name ||
                      payment.user
                        ?.full_name ||
                      payment.user
                        ?.email ||
                      "Unknown vendor";

                    const reference =
                      payment.payment_reference ||
                      "No reference provided";

                    const isProcessing =
                      actionLoading ===
                      payment.id;

                    return (
                      <div
                        key={payment.id}
                        className="glass rounded-2xl p-5 sm:p-6"
                      >
                        <div className="flex flex-col xl:flex-row xl:items-center gap-5">
                          {/* Main information */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h2 className="font-bold text-brand-navy truncate">
                                    {vendorName}
                                  </h2>

                                  <span
                                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                      payment.status ===
                                      "pending"
                                        ? "bg-brand-gold/10 text-brand-gold"
                                        : payment.status ===
                                            "approved"
                                          ? "bg-accent-success/10 text-accent-success"
                                          : "bg-accent-error/10 text-accent-error"
                                    }`}
                                  >
                                    {payment.status
                                      .charAt(
                                        0
                                      )
                                      .toUpperCase() +
                                      payment.status.slice(
                                        1
                                      )}
                                  </span>
                                </div>

                                <p className="text-sm text-gray-500">
                                  {payment.user
                                    ?.email ||
                                    payment.vendor
                                      ?.email ||
                                    "No email"}
                                </p>
                              </div>

                              <div className="text-left sm:text-right">
                                <p className="text-xl font-bold text-brand-navy">
                                  {formatNaira(
                                    Number(
                                      payment.amount
                                    )
                                  )}
                                </p>

                                <p className="text-xs text-gray-400">
                                  {payment.currency ||
                                    "NGN"}
                                </p>
                              </div>
                            </div>

                            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
                              <div>
                                <p className="text-xs text-gray-400 mb-1">
                                  Payment Reference
                                </p>

                                <p className="text-sm font-medium text-brand-navy break-all">
                                  {reference}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-gray-400 mb-1">
                                  Account
                                </p>

                                <p className="text-sm font-medium text-brand-navy">
                                  {payment.bank_name}
                                </p>

                                <p className="text-xs text-gray-500">
                                  {
                                    payment.account_number
                                  }
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-gray-400 mb-1">
                                  Submitted
                                </p>

                                <p className="text-sm font-medium text-brand-navy">
                                  {new Date(
                                    payment.submitted_at
                                  ).toLocaleDateString()}
                                </p>

                                <p className="text-xs text-gray-500">
                                  {new Date(
                                    payment.submitted_at
                                  ).toLocaleTimeString(
                                    [],
                                    {
                                      hour: "2-digit",
                                      minute:
                                        "2-digit",
                                    }
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-gray-400 mb-1">
                                  Request ID
                                </p>

                                <p className="text-xs font-mono text-gray-500 break-all">
                                  {payment.id}
                                </p>
                              </div>
                            </div>

                            {payment.admin_note && (
                              <div className="mt-4 rounded-xl bg-gray-50 p-3">
                                <p className="text-xs font-semibold text-brand-navy mb-1">
                                  Admin note
                                </p>

                                <p className="text-sm text-gray-600">
                                  {
                                    payment.admin_note
                                  }
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-wrap xl:flex-col gap-2 xl:w-36">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedPayment(
                                  payment
                                );
                                setAdminNote(
                                  payment.admin_note ||
                                    ""
                                );
                              }}
                              className="flex-1 xl:flex-none"
                            >
                              <Eye className="h-4 w-4" />
                              Details
                            </Button>

                            {payment.status ===
                              "pending" && (
                              <>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  disabled={
                                    !!actionLoading
                                  }
                                  onClick={() =>
                                    handleAction(
                                      payment,
                                      "approve"
                                    )
                                  }
                                  className="flex-1 xl:flex-none"
                                >
                                  {isProcessing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4" />
                                  )}
                                  Approve
                                </Button>

                                <Button
                                  variant="danger"
                                  size="sm"
                                  disabled={
                                    !!actionLoading
                                  }
                                  onClick={() =>
                                    handleAction(
                                      payment,
                                      "reject"
                                    )
                                  }
                                  className="flex-1 xl:flex-none"
                                >
                                  {isProcessing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <XCircle className="h-4 w-4" />
                                  )}
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </StaggerEntrance>
        </div>
      </main>

      {/* Details modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div
            className="absolute inset-0"
            onClick={() =>
              setSelectedPayment(null)
            }
          />

          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="p-6">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-brand-navy">
                    Payment Details
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    Verify the transfer before
                    approving.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedPayment(null)
                  }
                  className="text-gray-400 hover:text-brand-navy"
                  aria-label="Close"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl bg-brand-navy/5 p-4">
                  <p className="text-xs text-gray-500 mb-1">
                    Amount
                  </p>

                  <p className="text-2xl font-bold text-brand-navy">
                    {formatNaira(
                      Number(
                        selectedPayment.amount
                      )
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">
                      Vendor
                    </p>

                    <p className="text-sm font-semibold text-brand-navy">
                      {selectedPayment
                        .vendor
                        ?.business_name ||
                        selectedPayment.user
                          ?.full_name ||
                        "Unknown"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 mb-1">
                      Status
                    </p>

                    <p className="text-sm font-semibold text-brand-navy capitalize">
                      {
                        selectedPayment.status
                      }
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-400 mb-1">
                    Email
                  </p>

                  <p className="text-sm text-brand-navy break-all">
                    {selectedPayment.user
                      ?.email ||
                      selectedPayment.vendor
                        ?.email ||
                      "Not provided"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400 mb-1">
                    Phone
                  </p>

                  <p className="text-sm text-brand-navy">
                    {selectedPayment.user
                      ?.phone ||
                      selectedPayment.vendor
                        ?.phone ||
                      "Not provided"}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-400 mb-2">
                    Transfer destination
                  </p>

                  <p className="text-sm font-semibold text-brand-navy">
                    {
                      selectedPayment.bank_name
                    }
                  </p>

                  <p className="text-sm text-gray-600">
                    {
                      selectedPayment.account_number
                    }
                  </p>

                  <p className="text-sm text-gray-600">
                    {
                      selectedPayment.account_name
                    }
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400 mb-1">
                    Payment reference
                  </p>

                  <p className="text-sm font-mono text-brand-navy break-all">
                    {selectedPayment
                      .payment_reference ||
                      "Not provided"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400 mb-1">
                    Submitted
                  </p>

                  <p className="text-sm text-brand-navy">
                    {new Date(
                      selectedPayment.submitted_at
                    ).toLocaleString()}
                  </p>
                </div>

                {selectedPayment.status ===
                  "pending" && (
                  <div>
                    <label
                      htmlFor="admin-note"
                      className="text-xs font-semibold text-brand-navy block mb-2"
                    >
                      Admin note
                    </label>

                    <textarea
                      id="admin-note"
                      value={adminNote}
                      onChange={(event) =>
                        setAdminNote(
                          event.target.value
                        )
                      }
                      maxLength={2000}
                      rows={3}
                      placeholder="Optional note about this payment..."
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-gold resize-none"
                    />
                  </div>
                )}
              </div>

              {selectedPayment.status ===
                "pending" && (
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <Button
                    variant="primary"
                    className="flex-1"
                    disabled={
                      !!actionLoading
                    }
                    onClick={() =>
                      handleAction(
                        selectedPayment,
                        "approve"
                      )
                    }
                  >
                    {actionLoading ===
                    selectedPayment.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    Approve & Activate Pro
                  </Button>

                  <Button
                    variant="danger"
                    className="flex-1"
                    disabled={
                      !!actionLoading
                    }
                    onClick={() =>
                      handleAction(
                        selectedPayment,
                        "reject"
                      )
                    }
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}