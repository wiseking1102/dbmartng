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

const PRO_PRICE_NGN = 5000;

type AuthenticatedUser = {
  id: string;
  email?: string | null;
};

type VendorProfile = {
  id: string;
  subscription_status?: string | null;
};

type PaystackCustomerSearchResponse = {
  status?: boolean;
  message?: string;
  data?: Array<{
    customer_code?: string;
    email?: string;
  }>;
};

type PaystackCustomerResponse = {
  status?: boolean;
  message?: string;
  data?: {
    customer_code?: string;
  };
};

type PaystackTransactionResponse = {
  status?: boolean;
  message?: string;
  data?: {
    authorization_url?: string;
    access_code?: string;
    reference?: string;
  };
};

type PaystackSubscriptionResponse = {
  status?: boolean;
  message?: string;
  data?: {
    status?: string;
    next_payment_date?: string | null;
    subscription_code?: string;
    email_token?: string;
  };
};

/**
 * The generated Database type currently does not expose a usable
 * Insert/Update definition for some of the marketplace tables.
 *
 * This route is server-only and uses the Supabase service-role client,
 * so the database client is intentionally widened here to avoid the
 * generated `never` types blocking production builds.
 */
function getDb() {
  return createAdminClient() as any;
}

async function getAuthenticatedUser(
  request: Request
): Promise<AuthenticatedUser | null> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader
    .slice("Bearer ".length)
    .trim();

  if (!token) {
    return null;
  }

  try {
    const adminClient = getDb();

    const {
      data: authData,
      error,
    } = await adminClient.auth.getUser(token);

    if (error || !authData?.user) {
      return null;
    }

    return {
      id: authData.user.id,
      email: authData.user.email ?? null,
    };
  } catch (error) {
    console.error(
      "Subscription authentication error:",
      error
    );

    return null;
  }
}

function manualPaymentResponse(
  userId: string,
  vendorId: string,
  reason?: string
) {
  const params = new URLSearchParams({
    vendor_id: vendorId,
    user_id: userId,
    amount: String(PRO_PRICE_NGN),
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
        account_number:
          MANUAL_PAYMENT.account_number,
        account_name:
          MANUAL_PAYMENT.account_name,
        amount: PRO_PRICE_NGN,
        currency: "NGN",
      },
    },
    { status: 200 }
  );
}

function getPlanCode(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed;
}

// ─────────────────────────────────────────────
// POST: Initialize subscription checkout
// ─────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    let body: Record<string, unknown> = {};

    try {
      const parsedBody = await request.json();

      if (
        parsedBody &&
        typeof parsedBody === "object" &&
        !Array.isArray(parsedBody)
      ) {
        body = parsedBody as Record<string, unknown>;
      }
    } catch {
      body = {};
    }

    const planCode = getPlanCode(
      body.planCode
    );

    const authenticatedUser =
      await getAuthenticatedUser(request);

    if (!authenticatedUser) {
      return NextResponse.json(
        {
          error: "Authentication required",
        },
        { status: 401 }
      );
    }

    const userId = authenticatedUser.id;

    /*
     * Never trust an email supplied by the browser.
     * Use the authenticated Supabase email only.
     */
    const email =
      authenticatedUser.email?.trim().toLowerCase() || "";

    if (!email) {
      return NextResponse.json(
        {
          error:
            "Authenticated user email is required",
        },
        { status: 400 }
      );
    }

    const adminClient = getDb();

    /*
     * Get the vendor profile belonging to the
     * authenticated user.
     */
    const {
      data: vendorData,
      error: vendorError,
    } = await adminClient
      .from("vendor_profiles")
      .select("id, subscription_status")
      .eq("user_id", userId)
      .maybeSingle();

    if (vendorError) {
      console.error(
        "Vendor profile lookup error:",
        vendorError
      );

      return NextResponse.json(
        {
          error:
            "Failed to load vendor profile",
        },
        { status: 500 }
      );
    }

    if (!vendorData) {
      return NextResponse.json(
        {
          error:
            "Vendor profile not found",
        },
        { status: 404 }
      );
    }

    const vendorProfile =
      vendorData as VendorProfile;

    /*
     * Price is controlled by the server.
     *
     * The client cannot change the subscription
     * price by modifying its request payload.
     */
    const amountNgn = PRO_PRICE_NGN;

    /*
     * Resolve the Paystack secret key server-side.
     *
     * If unavailable, use the manual OPay fallback.
     * Nothing is activated here.
     */
    let secretKey: string;

    try {
      secretKey = await getSecretKey();

      if (!secretKey?.trim()) {
        return manualPaymentResponse(
          userId,
          vendorProfile.id,
          "Paystack key is unavailable"
        );
      }
    } catch (error) {
      console.error(
        "Unable to obtain Paystack secret key:",
        error
      );

      return manualPaymentResponse(
        userId,
        vendorProfile.id,
        "Paystack configuration unavailable"
      );
    }

    const reference =
      `DBM-${userId.slice(0, 8)}-` +
      `${Date.now()}-` +
      `${Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase()}`;

    /*
     * Find an existing Paystack customer.
     */
    let customerCode: string | null = null;

    try {
      const searchResponse = await fetch(
        `${PAYSTACK_API}/customer?email=${encodeURIComponent(
          email
        )}`,
        {
          method: "GET",
          headers: {
            Authorization:
              `Bearer ${secretKey}`,
            "Content-Type":
              "application/json",
          },
          cache: "no-store",
        }
      );

      if (searchResponse.ok) {
        const searchData =
          (await searchResponse.json()) as PaystackCustomerSearchResponse;

        if (
          searchData.status &&
          Array.isArray(searchData.data) &&
          searchData.data.length > 0
        ) {
          customerCode =
            searchData.data[0]?.customer_code ||
            null;
        }
      }
    } catch (error) {
      console.error(
        "Paystack customer search failed:",
        error
      );

      return manualPaymentResponse(
        userId,
        vendorProfile.id,
        "Paystack customer lookup failed"
      );
    }

    /*
     * Create a Paystack customer if one does not
     * already exist.
     */
    if (!customerCode) {
      try {
        const customerResponse =
          await fetch(
            `${PAYSTACK_API}/customer`,
            {
              method: "POST",
              headers: {
                Authorization:
                  `Bearer ${secretKey}`,
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                email,
                metadata: {
                  userId,
                  vendorId:
                    vendorProfile.id,
                },
              }),
              cache: "no-store",
            }
          );

        const customerData =
          (await customerResponse.json()) as PaystackCustomerResponse;

        if (
          !customerResponse.ok ||
          !customerData.status ||
          !customerData.data?.customer_code
        ) {
          console.error(
            "Paystack customer creation failed:",
            customerData
          );

          return manualPaymentResponse(
            userId,
            vendorProfile.id,
            "Paystack customer creation failed"
          );
        }

        customerCode =
          customerData.data.customer_code;
      } catch (error) {
        console.error(
          "Paystack customer creation error:",
          error
        );

        return manualPaymentResponse(
          userId,
          vendorProfile.id,
          "Paystack customer creation failed"
        );
      }
    }

    /*
     * Initialize the Paystack transaction.
     */
    let transactionData:
      PaystackTransactionResponse;

    try {
      const amountKobo =
        toKobo(amountNgn);

      const transactionResponse =
        await fetch(
          `${PAYSTACK_API}/transaction/initialize`,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${secretKey}`,
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              email,
              amount: amountKobo,

              ...(planCode
                ? {
                    plan: planCode,
                  }
                : {}),

              channels: [
                ...ALL_PAYMENT_CHANNELS,
              ],

              reference,

              metadata: {
                userId,
                vendorId:
                  vendorProfile.id,
                type: "subscription",
                planCode,
                amountNgn,
              },
            }),
            cache: "no-store",
          }
        );

      transactionData =
        (await transactionResponse.json()) as PaystackTransactionResponse;

      /*
       * Any Paystack initialization failure
       * falls back to manual OPay payment.
       */
      if (
        !transactionResponse.ok ||
        !transactionData.status ||
        !transactionData.data
          ?.authorization_url
      ) {
        console.error(
          "Paystack transaction initialization failed:",
          transactionData
        );

        return manualPaymentResponse(
          userId,
          vendorProfile.id,
          transactionData.message ||
            "Paystack payment initialization failed"
        );
      }
    } catch (error) {
      console.error(
        "Paystack transaction initialization error:",
        error
      );

      return manualPaymentResponse(
        userId,
        vendorProfile.id,
        "Unable to connect to Paystack"
      );
    }

    /*
     * IMPORTANT:
     *
     * Initializing a Paystack transaction does NOT
     * mean payment succeeded.
     *
     * Keep the local subscription pending until a
     * server-side verification/webhook confirms
     * successful payment.
     */
    const { error: subscriptionError } =
      await adminClient
        .from("subscriptions")
        .upsert(
          {
            vendor_id:
              vendorProfile.id,
            user_id: userId,
            paystack_customer_code:
              customerCode,
            paystack_subscription_code:
              null,
            paystack_plan_code:
              planCode,
            tier: "pro",
            status: "pending",
            price_paid: amountNgn,
            currency: "NGN",
            current_period_start:
              null,
            current_period_end:
              null,
          },
          {
            onConflict: "user_id",
          }
        );

    if (subscriptionError) {
      console.error(
        "Failed to create pending subscription record:",
        subscriptionError
      );

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
        authorization_url:
          transactionData.data
            ?.authorization_url,
        reference,
        access_code:
          transactionData.data
            ?.access_code,
        customer_code:
          customerCode,
        amount: amountNgn,
        currency: "NGN",
      },
    });
  } catch (error) {
    console.error(
      "Subscription initialization error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Internal server error",
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
    const authenticatedUser =
      await getAuthenticatedUser(request);

    if (!authenticatedUser) {
      return NextResponse.json(
        {
          error:
            "Authentication required",
        },
        { status: 401 }
      );
    }

    const userId =
      authenticatedUser.id;

    let secretKey: string;

    try {
      secretKey =
        await getSecretKey();

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
      console.error(
        "Unable to obtain Paystack secret key:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Paystack is currently unavailable. Manual payment is available for new payments.",
          fallback: "manual",
        },
        { status: 503 }
      );
    }

    const adminClient =
      getDb();

    /*
     * Only inspect the subscription belonging
     * to the authenticated user.
     */
    const {
      data: subscriptionData,
      error: subscriptionLookupError,
    } = await adminClient
      .from("subscriptions")
      .select(
        [
          "id",
          "vendor_id",
          "paystack_subscription_code",
          "tier",
          "status",
        ].join(", ")
      )
      .eq("user_id", userId)
      .eq("tier", "pro")
      .maybeSingle();

    if (subscriptionLookupError) {
      console.error(
        "Subscription lookup error:",
        subscriptionLookupError
      );

      return NextResponse.json(
        {
          error:
            "Failed to load subscription",
        },
        { status: 500 }
      );
    }

    if (!subscriptionData) {
      return NextResponse.json(
        {
          error:
            "No Pro subscription found for this vendor",
        },
        { status: 404 }
      );
    }

    const subscription =
      subscriptionData as {
        id: string;
        vendor_id: string;
        paystack_subscription_code:
          | string
          | null;
        tier: string;
        status: string;
      };

    if (
      !subscription.paystack_subscription_code
    ) {
      return NextResponse.json(
        {
          error:
            "No Paystack subscription found for this vendor",
        },
        { status: 404 }
      );
    }

    let paystackData:
      PaystackSubscriptionResponse;

    try {
      const response =
        await fetch(
          `${PAYSTACK_API}/subscription/${encodeURIComponent(
            subscription.paystack_subscription_code
          )}`,
          {
            method: "GET",
            headers: {
              Authorization:
                `Bearer ${secretKey}`,
              "Content-Type":
                "application/json",
            },
            cache: "no-store",
          }
        );

      paystackData =
        (await response.json()) as PaystackSubscriptionResponse;

      if (
        !response.ok ||
        !paystackData.status ||
        !paystackData.data
      ) {
        return NextResponse.json(
          {
            error:
              paystackData.message ||
              "Failed to fetch subscription from Paystack",
          },
          { status: 502 }
        );
      }
    } catch (error) {
      console.error(
        "Paystack subscription lookup failed:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Unable to connect to Paystack",
        },
        { status: 502 }
      );
    }

    const paystackSubscription =
      paystackData.data;

    const paystackStatus =
      paystackSubscription.status;

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

      case "attention":
        newStatus = "past_due";
        break;

      default:
        newStatus = "payment_failed";
        break;
    }

    const subscriptionUpdate: Record<
      string,
      unknown
    > = {
      status: newStatus,
    };

    if (
      paystackSubscription.next_payment_date
    ) {
      const nextPaymentDate =
        new Date(
          paystackSubscription.next_payment_date
        );

      if (
        !Number.isNaN(
          nextPaymentDate.getTime()
        )
      ) {
        subscriptionUpdate.current_period_end =
          nextPaymentDate.toISOString();
      }
    }

    const {
      error: subscriptionUpdateError,
    } = await adminClient
      .from("subscriptions")
      .update(subscriptionUpdate)
      .eq("id", subscription.id)
      .eq("user_id", userId);

    if (subscriptionUpdateError) {
      console.error(
        "Failed to update subscription:",
        subscriptionUpdateError
      );

      return NextResponse.json(
        {
          error:
            "Failed to update subscription",
        },
        { status: 500 }
      );
    }

    /*
     * Only verified Paystack subscription state
     * changes the vendor subscription status.
     */
    const profileStatus =
      newStatus === "active"
        ? "pro"
        : newStatus === "cancelled" ||
            newStatus === "payment_failed"
          ? "free"
          : "payment_failed";

    const {
      error: profileError,
    } = await adminClient
      .from("vendor_profiles")
      .update({
        subscription_status:
          profileStatus,
      })
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
        paystack_status:
          paystackStatus,
        local_status:
          newStatus,
        profile_status:
          profileStatus,
      },
    });
  } catch (error) {
    console.error(
      "Subscription re-sync error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Internal server error",
      },
      { status: 500 }
    );
  }
}
