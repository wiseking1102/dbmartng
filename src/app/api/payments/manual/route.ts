import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MANUAL_PAYMENT = {
  bank_name: "OPay",
  account_number: "6565411855",
  account_name: "CHINEDU GOODLUCK OBASIOKOLO",
};

const PRO_PRICE = 5000;

async function getAuthenticatedUser(request: Request) {
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

  const adminClient = createAdminClient();

  const {
    data: { user },
    error,
  } = await adminClient.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    const { data: vendor, error: vendorError } =
      await adminClient
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
        { error: "Unable to load vendor profile" },
        { status: 500 }
      );
    }

    if (!vendor) {
      return NextResponse.json(
        { error: "Vendor profile not found" },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));

    /*
     * Never trust the amount sent by the browser.
     * Pro currently costs ₦5,000.
     */
    const requestedAmount = Number(body?.amount);

    if (
      requestedAmount &&
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

    /*
     * Prevent duplicate pending requests.
     */
    const { data: existing } = await adminClient
      .from("manual_payment_requests")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        success: true,
        existing: true,
        request_id: existing.id,
        status: "pending",
        message:
          "You already have a payment request awaiting review.",
      });
    }

    const { data: paymentRequest, error } =
      await adminClient
        .from("manual_payment_requests")
        .insert({
          vendor_id: vendor.id,
          user_id: user.id,
          amount: PRO_PRICE,
          currency: "NGN",
          bank_name: MANUAL_PAYMENT.bank_name,
          account_number: MANUAL_PAYMENT.account_number,
          account_name: MANUAL_PAYMENT.account_name,
          status: "pending",
        })
        .select("id, status, submitted_at")
        .single();

    if (error) {
      console.error(
        "Manual payment request creation failed:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Failed to submit your payment request.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      existing: false,
      request_id: paymentRequest.id,
      status: paymentRequest.status,
      submitted_at: paymentRequest.submitted_at,
      message:
        "Payment request submitted for admin review.",
    });
  } catch (error) {
    console.error(
      "Manual payment API error:",
      error
    );

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}