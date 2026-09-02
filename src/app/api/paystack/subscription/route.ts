import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  toKobo,
  ALL_PAYMENT_CHANNELS,
} from "@/lib/paystack";
import { getSecretKey } from "@/lib/paystack/keys";

const PAYSTACK_API = "https://api.paystack.co";

const MANUAL_PAYMENT = {
  bank_name: "OPay",
  account_number: "6565411855",
  account_name: "CHINEDU GOODLUCK OBASIOKOLO",
};

const DEFAULT_PRICE_NGN = 5000;

type AuthenticatedUser = {
  id: string;
  email?: string | null;
};

async function getAuthenticatedUser(
  request: Request
): Promise<AuthenticatedUser | null> {
  const adminClient = createAdminClient();

  /*
   * Prefer the authenticated Supabase session.
   *
   * The frontend must never be trusted to tell us which user is
   * requesting payment.
   */
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice("Bearer ".length).trim();

  if (!token) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await adminClient.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
  };
}

function getSafePrice(price: unknown): number {
  if (typeof price !== "number" && typeof price !== "string") {
    return DEFAULT_PRICE_NGN;
  }

  const parsed = Number(price);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_PRICE_NGN;
  }

  return Math.round(parsed * 100) / 100;
}

function manualPaymentResponse(
  userId: string,
  vendorId: string,
  amount: number,
  reason?: string
) {
  const params = new URLSearchParams({
    vendor_id: vendorId,
    user_id: userId,
    amount: String(amount),
    currency: "NGN",
    bank_name: MANUAL_PAYMENT.bank_name,
    account_number: MANUAL_PAYMENT.account_number,
    account_name: MANUAL_PAYMENT.account_name,
  });

  if (reason) {
    params.set("reason", reason);
  }

  return NextResponse.json(
    {
      success: false,
      fallback: "manual",
      payment_method: "manual_opay",
      message:
        "Online payment is currently unavailable. You can complete payment manually.",
      data: {
        payment_url: `/payment/manual?${params.toString()}`,
        bank_name: MANUAL_PAYMENT.bank_name,
        account_number: MANUAL_PAYMENT.account_number,
        account_name: MANUAL_PAYMENT.account_name,
        amount,
        currency: "NGN",
      },
    },
    { status: 200 }
  );
}

// ─────────────────────────────────────────────
// POST: Initialize subscription checkout
// ─────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      email: requestedEmail,
      planCode,
      price,
    } = body || {};

    const authenticatedUser = await getAuthenticatedUser(request);

    if (!authenticatedUser) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = authenticatedUser.id;

    /*
     * Never trust an email supplied by the browser.
     * Use the authenticated Supabase email instead.
     */
    const email =
      authenticatedUser.email ||
      (typeof requestedEmail === "string"
        ? requestedEmail.trim().toLowerCase()
        : "");

    if (!email) {
      return NextResponse.json(
        { error: "Authenticated user email is required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Get vendor profile belonging to the authenticated user.
    const { data: vendorProfile, error: vendorError } = await adminClient
      .from("vendor_profiles")
      .select("id, subscription_status")
      .eq("user_id", userId)
      .maybeSingle();

    if (vendorError) {
      console.error("Vendor profile lookup error:", vendorError);

      return NextResponse.json(
        { error: "Failed to load vendor profile" },
        { status: 500 }
      );
    }

    if (!vendorProfile) {
      return NextResponse.json(
        { error: "Vendor profile not found" },
        { status: 404 }
      );
    }

    const amountNgn = getSafePrice(price);

    /*
     * Paystack key is intentionally resolved server-side.
     *
     * If it is missing, invalid, or unavailable, we do NOT activate
     * anything. We simply return the manual OPay fallback.
     */
    let secretKey: string;

    try {
      secretKey = await getSecretKey();

      if (!secretKey?.trim()) {
        return manualPaymentResponse(
          userId,
          vendorProfile.id,
          amountNgn,
          "Paystack key is unavailable"
        );
      }
    } catch (error) {
      console.error("Unable to obtain Paystack secret key:", error);

      return manualPaymentResponse(
        userId,
        vendorProfile.id,
        amountNgn,
        "Paystack configuration unavailable"
      );
    }

    const reference = `DBM-${userId.slice(0, 8)}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;

    /*
     * Find an existing Paystack customer.
     */
    let customerCode: string | null = null;

    try {
      const searchResponse = await fetch(
        `${PAYSTACK_API}/customer?email=${encodeURIComponent(email)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();

        if (
          searchData?.status &&
          Array.isArray(searchData.data) &&
          searchData.data.length > 0
        ) {
          customerCode = searchData.data[0]?.customer_code || null;
        }
      }
    } catch (error) {
      console.error("Paystack customer search failed:", error);

      return manualPaymentResponse(
        userId,
        vendorProfile.id,
        amountNgn,
        "Paystack customer lookup failed"
      );
    }

    /*
     * Create Paystack customer when one does not already exist.
     */
    if (!customerCode) {
      try {
        const customerResponse = await fetch(
          `${PAYSTACK_API}/customer`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${secretKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email,
              metadata: {
                userId,
                vendorId: vendorProfile.id,
              },
            }),
            cache: "no-store",
          }
        );

        const customerData = await customerResponse.json();

        if (
          !customerResponse.ok ||
          !customerData?.status ||
          !customerData?.data?.customer_code
        ) {
          console.error(
            "Paystack customer creation failed:",
            customerData
          );

          return manualPaymentResponse(
            userId,
            vendorProfile.id,
            amountNgn,
            "Paystack customer creation failed"
          );
        }

        customerCode = customerData.data.customer_code;
      } catch (error) {
        console.error("Paystack customer creation error:", error);

        return manualPaymentResponse(
          userId,
          vendorProfile.id,
          amountNgn,
          "Paystack customer creation failed"
        );
      }
    }

    /*
     * Initialize Paystack checkout.
     */
    let txnData: any;

    try {
      const amountKobo = toKobo(amountNgn);

      const txnResponse = await fetch(
        `${PAYSTACK_API}/transaction/initialize`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            amount: amountKobo,
            plan: planCode || undefined,
            channels: [...ALL_PAYMENT_CHANNELS],
            reference,
            metadata: {
              userId,
              vendorId: vendorProfile.id,
              type: "subscription",
              amountNgn,
            },
          }),
          cache: "no-store",
        }
      );

      txnData = await txnResponse.json();

      /*
       * Any Paystack initialization failure should fall back to OPay.
       */
      if (
        !txnResponse.ok ||
        !txnData?.status ||
        !txnData?.data?.authorization_url
      ) {
        console.error(
          "Paystack transaction initialization failed:",
          txnData
        );

        return manualPaymentResponse(
          userId,
          vendorProfile.id,
          amountNgn,
          txnData?.message || "Paystack payment initialization failed"
        );
      }
    } catch (error) {
      console.error("Paystack transaction initialization error:", error);

      return manualPaymentResponse(
        userId,
        vendorProfile.id,
        amountNgn,
        "Unable to connect to Paystack"
      );
    }

    /*
     * IMPORTANT:
     *
     * We do NOT mark the subscription active here.
     *
     * The transaction has only been initialized.
     * Activation must happen after verified payment through the
     * existing Paystack verification/webhook flow.
     */
    const { error: subscriptionError } = await adminClient
      .from("subscriptions")
      .upsert(
        {
          vendor_id: vendorProfile.id,
          user_id: userId,
          paystack_customer_code: customerCode,
          paystack_subscription_code: null,
          paystack_plan_code: planCode || null,
          tier: "pro",
          status: "pending",
          price_paid: amountNgn,
          currency: "NGN",
          current_period_start: null,
          current_period_end: null,
        } as never,
        {
          onConflict: "user_id",
        }
      );

    if (subscriptionError) {
      console.error(
        "Failed to create pending subscription record:",
        subscriptionError
      );

      /*
       * Do not silently lose the checkout reference.
       * The user can still continue to Paystack, but we surface the
       * server problem rather than pretending everything was stored.
       */
      return NextResponse.json(
        {
          error:
            "Payment was initialized, but we could not prepare your subscription record. Please contact support before paying.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      fallback: null,
      payment_method: "paystack",
      data: {
        authorization_url: txnData.data.authorization_url,
        reference,
        access_code: txnData.data.access_code,
        customer_code: customerCode,
        amount: amountNgn,
        currency: "NGN",
      },
    });
  } catch (error) {
    console.error("Subscription initialization error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────
// PUT: Re-sync an existing Paystack subscription
// ─────────────────────────────────────────────
export async function PUT(request: Request) {
  try {
    const authenticatedUser = await getAuthenticatedUser(request);

    if (!authenticatedUser) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = authenticatedUser.id;

    let secretKey: string;

    try {
      secretKey = await getSecretKey();

      if (!secretKey?.trim()) {
        return NextResponse.json(
          {
            error:
              "Paystack is currently unavailable. Manual payment is available for new payments.",
            fallback: "manual",
          },
          { status: 503 }
        );
      }
    } catch (error) {
      console.error("Unable to obtain Paystack secret key:", error);

      return NextResponse.json(
        {
          error:
            "Paystack is currently unavailable. Manual payment is available for new payments.",
          fallback: "manual",
        },
        { status: 503 }
      );
    }

    const adminClient = createAdminClient();

    const { data: sub, error: subError } = await adminClient
      .from("subscriptions")
      .select(
        "id, vendor_id, paystack_subscription_code, tier, status"
      )
      .eq("user_id", userId)
      .eq("tier", "pro")
      .maybeSingle();

    if (subError) {
      console.error("Subscription lookup error:", subError);

      return NextResponse.json(
        { error: "Failed to load subscription" },
        { status: 500 }
      );
    }

    if (!sub?.paystack_subscription_code) {
      return NextResponse.json(
        {
          error: "No Paystack subscription found for this vendor",
        },
        { status: 404 }
      );
    }

    let result: any;

    try {
      const response = await fetch(
        `${PAYSTACK_API}/subscription/${encodeURIComponent(
          sub.paystack_subscription_code
        )}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );

      result = await response.json();

      if (!response.ok || !result?.status) {
        return NextResponse.json(
          {
            error:
              result?.message ||
              "Failed to fetch subscription from Paystack",
          },
          { status: 502 }
        );
      }
    } catch (error) {
      console.error("Paystack subscription lookup failed:", error);

      return NextResponse.json(
        {
          error: "Unable to connect to Paystack",
        },
        { status: 502 }
      );
    }

    const psSub = result.data;
    const paystackStatus = psSub?.status;

    let newStatus: string;

    switch (paystackStatus) {
      case "active":
        newStatus = "active";
        break;

      case "cancelled":
        newStatus = "cancelled";
        break;

      case "past_due":
        newStatus = "past_due";
        break;

      default:
        newStatus = "payment_failed";
        break;
    }

    const updateData: Record<string, unknown> = {
      status: newStatus,
    };

    if (psSub?.next_payment_date) {
      updateData.current_period_end = new Date(
        psSub.next_payment_date
      ).toISOString();
    }

    const { error: updateError } = await adminClient
      .from("subscriptions")
      .update(updateData as never)
      .eq("id", sub.id);

    if (updateError) {
      console.error(
        "Failed to update subscription:",
        updateError
      );

      return NextResponse.json(
        { error: "Failed to update subscription" },
        { status: 500 }
      );
    }

    /*
     * Only verified Paystack subscription state changes the vendor
     * subscription status here.
     */
    const profileStatus =
      newStatus === "active"
        ? "pro"
        : newStatus === "cancelled" ||
            newStatus === "payment_failed"
          ? "free"
          : "payment_failed";

    const { error: profileError } = await adminClient
      .from("vendor_profiles")
      .update({
        subscription_status: profileStatus,
      } as never)
      .eq("user_id", userId);

    if (profileError) {
      console.error(
        "Failed to update vendor subscription status:",
        profileError
      );

      return NextResponse.json(
        {
          error:
            "Subscription was synced, but vendor profile status could not be updated.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        paystack_status: paystackStatus,
        local_status: newStatus,
        profile_status: profileStatus,
      },
    });
  } catch (error) {
    console.error("Subscription re-sync error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}