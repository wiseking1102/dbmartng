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

type UserProfile = {
  role: string | null;
};

type VendorProfile = {
  id: string;
  user_id: string;
};

type ExistingPaymentRequest = {
  id: string;
  status: "pending" | "approved" | "rejected";
  payment_reference: string | null;
};

type CreatedPaymentRequest = {
  id: string;
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
};

/**
 * The generated Database type currently does not expose a usable
 * Insert type for manual_payment_requests. Keep this route server-side
 * and use the admin client without the broken generated table typing.
 */
function getDb() {
  return createAdminClient() as any;
}

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
      "Manual payment authentication error:",
      error
    );

    return null;
  }
}

/**
 * Explicitly verify the authenticated user's role is "vendor".
 * A vendor_profiles row alone is not proof of the vendor role:
 * the authoritative role lives in public.users.role.
 */
async function requireVendorRole(
  adminClient: ReturnType<typeof getDb>,
  userId: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const {
    data: userData,
    error: userError,
  } = await adminClient
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (userError) {
    console.error(
      "User role lookup error:",
      userError
    );

    return {
      ok: false,
      status: 500,
      error: "Unable to verify your account.",
    };
  }

  const profile = userData as UserProfile | null;

  if (!profile || profile.role !== "vendor") {
    return {
      ok: false,
      status: 403,
      error:
        "Only vendor accounts can request manual payment.",
    };
  }

  return { ok: true };
}

function paymentConfigResponse(extra: Record<string, unknown> = {}) {
  return {
    amount: PRO_PRICE,
    currency: "NGN",
    bank_name: MANUAL_PAYMENT.bank_name,
    account_number: MANUAL_PAYMENT.account_number,
    account_name: MANUAL_PAYMENT.account_name,
    payment_method: "manual_opay",
    ...extra,
  };
}

/**
 * GET /api/payments/manual
 *
 * Returns the authoritative payment details (amount, bank account)
 * for the authenticated vendor, plus their current request state.
 *
 * The manual payment page calls this instead of trusting URL
 * parameters — the browser must never be the source of truth
 * for the amount or receiving account.
 */
export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          error: "Authentication required",
        },
        { status: 401 }
      );
    }

    const adminClient = getDb();

    const roleCheck = await requireVendorRole(
      adminClient,
      user.id
    );

    if (!roleCheck.ok) {
      return NextResponse.json(
        { error: roleCheck.error },
        { status: roleCheck.status }
      );
    }

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

    /*
     * Surface the vendor's most recent request so the UI can
     * show "already submitted" instead of allowing duplicates.
     */
    const {
      data: existingData,
      error: existingError,
    } = await adminClient
      .from("manual_payment_requests")
      .select("id, status, payment_reference")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error(
        "Existing payment request lookup error:",
        existingError
      );
      // Non-fatal: fall through with no existing request
    }

    const existing =
      (existingData as unknown as ExistingPaymentRequest | null) ||
      null;

    return NextResponse.json({
      success: true,
      ...paymentConfigResponse({
        existing: existing?.status === "pending",
        request_id: existing?.id || null,
        request_status: existing?.status || null,
        message:
          existing?.status === "pending"
            ? "You already have a payment request awaiting review."
            : undefined,
      }),
    });
  } catch (error) {
    console.error(
      "Manual payment GET error:",
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

/**
 * POST /api/payments/manual
 *
 * Creates a manual payment request for the authenticated vendor.
 *
 * Security:
 * - user_id/vendor_id/amount/account are generated server-side.
 * - users.role must be "vendor" (explicit check, not inferred).
 * - Duplicate pending requests are blocked in the API and,
 *   via the unique partial index, at the database level.
 * - payment_reference is stored for admin verification.
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          error: "Authentication required",
        },
        { status: 401 }
      );
    }

    const adminClient = getDb();

    const roleCheck = await requireVendorRole(
      adminClient,
      user.id
    );

    if (!roleCheck.ok) {
      return NextResponse.json(
        { error: roleCheck.error },
        { status: roleCheck.status }
      );
    }

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

    /*
     * The amount is ultimately controlled by the server.
     * If the client sends an amount, only accept the exact
     * current Pro price.
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
     * Collect the transfer reference the vendor typed on the
     * payment page. Optional historically, but strongly
     * encouraged — it is what the admin uses to verify.
     */
    const paymentReference =
      typeof body.payment_reference === "string" &&
      body.payment_reference.trim()
        ? body.payment_reference.trim().slice(0, 255)
        : null;

    /*
     * Prevent duplicate pending manual payment requests
     * for the same authenticated vendor.
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
        ...paymentConfigResponse({
          message:
            "You already have a payment request awaiting review.",
        }),
      });
    }

    /*
     * All important payment details are generated server-side.
     * The browser cannot choose the receiving account,
     * vendor ID, user ID, or payment amount.
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
        payment_reference: paymentReference,
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

      /*
       * 23505 = unique_violation. With the new partial unique
       * index, this is the race where another concurrent
       * submission already created the pending request.
       */
      if (
        (paymentRequestError as { code?: string })
          .code === "23505"
      ) {
        return NextResponse.json({
          success: true,
          existing: true,
          ...paymentConfigResponse({
            message:
              "You already have a payment request awaiting review.",
          }),
        });
      }

      return NextResponse.json(
        {
          error:
            "Failed to submit your payment request.",
        },
        { status: 500 }
      );
    }

    const paymentRequest =
      paymentRequestData as CreatedPaymentRequest;

    return NextResponse.json({
      success: true,
      existing: false,
      request_id: paymentRequest.id,
      status: paymentRequest.status,
      submitted_at:
        paymentRequest.submitted_at,
      ...paymentConfigResponse({
        message:
          "Payment request submitted for admin review.",
      }),
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
