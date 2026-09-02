import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MANUAL_PAYMENT = {
  bank_name: "OPay",
  account_number: "6565411855",
  account_name: "CHINEDU GOODLUCK OBASIOKOLO",
};

const PRO_PRICE = 5000;

type AuthUser = {
  id: string;
  email?: string | null;
};

type VendorProfile = {
  id: string;
  user_id: string;
};

type ExistingPaymentRequest = {
  id: string;
  status: "pending" | "approved" | "rejected";
};

type CreatedPaymentRequest = {
  id: string;
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
};

async function getAuthenticatedUser(
  request: Request
): Promise<AuthUser | null> {
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
    const adminClient = createAdminClient();

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
      "Manual payment authentication error:",
      error
    );

    return null;
  }
}

export async function POST(request: Request) {
  try {
    /*
     * Authentication is always derived from the
     * server-verified bearer token.
     *
     * Never trust user_id/vendor_id from the browser.
     */
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          error: "Authentication required",
        },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    /*
     * Resolve the vendor profile from the authenticated user.
     */
    const {
      data: vendorData,
      error: vendorError,
    } = await adminClient
      .from("vendor_profiles")
      .select("id, user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (vendorError) {
      console.error(
        "Vendor lookup error:",
        vendorError
      );

      return NextResponse.json(
        {
          error: "Unable to load vendor profile",
        },
        { status: 500 }
      );
    }

    if (!vendorData) {
      return NextResponse.json(
        {
          error: "Vendor profile not found",
        },
        { status: 404 }
      );
    }

    const vendor =
      vendorData as VendorProfile;

    /*
     * Read the body only for compatibility with the
     * existing frontend.
     *
     * The amount is NOT trusted. The server determines
     * the actual Pro price.
     */
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
      /*
       * Empty request bodies are allowed because the
       * server already knows the Pro price.
       */
    }

    /*
     * If the client sends an amount, validate it.
     *
     * Regardless of the supplied amount, the inserted
     * payment request always uses PRO_PRICE.
     */
    if (body.amount !== undefined) {
      const requestedAmount =
        Number(body.amount);

      if (
        !Number.isFinite(requestedAmount) ||
        Math.round(requestedAmount * 100) !==
          Math.round(PRO_PRICE * 100)
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid payment amount. Pro currently costs ₦5,000.",
          },
          { status: 400 }
        );
      }
    }

    /*
     * Prevent duplicate pending requests.
     *
     * The result is explicitly typed so stale/generated
     * Supabase database types cannot turn the result
     * into `never`.
     */
    const {
      data: existingData,
      error: existingError,
    } = await adminClient
      .from("manual_payment_requests")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle();

    if (existingError) {
      console.error(
        "Existing payment request lookup error:",
        existingError
      );

      return NextResponse.json(
        {
          error:
            "Failed to check existing payment requests.",
        },
        { status: 500 }
      );
    }

    const existing =
      existingData as ExistingPaymentRequest | null;

    if (existing) {
      return NextResponse.json({
        success: true,
        existing: true,
        request_id: existing.id,
        status: existing.status,
        payment_method: "manual_opay",
        bank_name:
          MANUAL_PAYMENT.bank_name,
        account_number:
          MANUAL_PAYMENT.account_number,
        account_name:
          MANUAL_PAYMENT.account_name,
        amount: PRO_PRICE,
        currency: "NGN",
        message:
          "You already have a payment request awaiting review.",
      });
    }

    /*
     * Create the manual payment request.
     *
     * Every important value is server-controlled:
     * - user_id
     * - vendor_id
     * - amount
     * - currency
     * - bank details
     * - status
     */
    const {
      data: paymentRequestData,
      error: paymentRequestError,
    } = await adminClient
      .from("manual_payment_requests")
      .insert({
        vendor_id: vendor.id,
        user_id: user.id,
        amount: PRO_PRICE,
        currency: "NGN",
        bank_name:
          MANUAL_PAYMENT.bank_name,
        account_number:
          MANUAL_PAYMENT.account_number,
        account_name:
          MANUAL_PAYMENT.account_name,
        status: "pending",
      })
      .select(
        "id, status, submitted_at"
      )
      .single();

    if (paymentRequestError) {
      console.error(
        "Manual payment request creation failed:",
        paymentRequestError
      );

      return NextResponse.json(
        {
          error:
            "Failed to submit your payment request.",
        },
        { status: 500 }
      );
    }

    /*
     * Explicit type cast avoids the generated Database
     * type becoming `never` when this table is newer
     * than the generated Supabase types.
     */
    const paymentRequest =
      paymentRequestData as CreatedPaymentRequest;

    return NextResponse.json({
      success: true,
      existing: false,
      request_id: paymentRequest.id,
      status: paymentRequest.status,
      submitted_at:
        paymentRequest.submitted_at,
      payment_method: "manual_opay",
      bank_name:
        MANUAL_PAYMENT.bank_name,
      account_number:
        MANUAL_PAYMENT.account_number,
      account_name:
        MANUAL_PAYMENT.account_name,
      amount: PRO_PRICE,
      currency: "NGN",
      message:
        "Payment request submitted for admin review.",
    });
  } catch (error) {
    console.error(
      "Manual payment API error:",
      error
    );

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
