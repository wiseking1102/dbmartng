import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminUser = {
  id: string;
  role: "admin" | "sub_admin";
};

type UserProfile = {
  id: string;
  role: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
};

type VendorProfile = {
  id: string;
  user_id?: string | null;
  business_name?: string | null;
  email?: string | null;
  phone?: string | null;
};

type ManualPaymentRequest = {
  id: string;
  vendor_id: string;
  user_id: string;
  amount: number;
  currency: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  payment_reference: string | null;
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};

type PaymentAction = "approve" | "reject";

/**
 * The generated Supabase Database type can lag behind
 * migrations already applied to the project.
 *
 * This route is server-only and uses the service-role client.
 * Keep the runtime queries explicit here instead of allowing
 * stale generated types to turn valid query results into `never`.
 */
function getDb() {
  return createAdminClient() as any;
}

async function authenticateAdmin(
  request: Request
): Promise<AdminUser | null> {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization
    .slice("Bearer ".length)
    .trim();

  if (!token) {
    return null;
  }

  try {
    const supabase = getDb();

    const {
      data: authData,
      error: authError,
    } = await supabase.auth.getUser(token);

    const user = authData?.user;

    if (authError || !user) {
      return null;
    }

    const {
      data: profileData,
      error: profileError,
    } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profileData) {
      return null;
    }

    const profile = profileData as {
      role: string | null;
    };

    const role = profile.role;

    if (role !== "admin" && role !== "sub_admin") {
      return null;
    }

    return {
      id: user.id,
      role,
    };
  } catch (error) {
    console.error(
      "Admin authentication error:",
      error
    );

    return null;
  }
}

/**
 * GET
 *
 * Returns manual payment requests for admins/sub-admins.
 *
 * Supported:
 * ?status=pending
 * ?status=approved
 * ?status=rejected
 * ?status=all
 */
export async function GET(request: Request) {
  try {
    const admin = await authenticateAdmin(request);

    if (!admin) {
      return NextResponse.json(
        {
          error: "Admin authentication required",
        },
        { status: 401 }
      );
    }

    const supabase = getDb();
    const url = new URL(request.url);

    const requestedStatus =
      url.searchParams.get("status") || "pending";

    let query = supabase
      .from("manual_payment_requests")
      .select(
        `
          id,
          vendor_id,
          user_id,
          amount,
          currency,
          bank_name,
          account_number,
          account_name,
          payment_reference,
          status,
          submitted_at,
          reviewed_at,
          reviewed_by,
          admin_note,
          created_at,
          updated_at
        `
      )
      .order("created_at", {
        ascending: false,
      });

    if (
      requestedStatus === "pending" ||
      requestedStatus === "approved" ||
      requestedStatus === "rejected"
    ) {
      query = query.eq(
        "status",
        requestedStatus
      );
    }

    const {
      data: requestData,
      error,
    } = await query;

    if (error) {
      console.error(
        "Manual payment request lookup error:",
        error
      );

      return NextResponse.json(
        {
          error: "Failed to load payment requests",
        },
        { status: 500 }
      );
    }

    const paymentRequests =
      (requestData || []) as ManualPaymentRequest[];

    if (paymentRequests.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
        status: requestedStatus,
      });
    }

    const userIds = [
      ...new Set(
        paymentRequests.map(
          (payment) => payment.user_id
        )
      ),
    ];

    const vendorIds = [
      ...new Set(
        paymentRequests.map(
          (payment) => payment.vendor_id
        )
      ),
    ];

    const [
      usersResult,
      vendorsResult,
    ] = await Promise.all([
      userIds.length > 0
        ? supabase
            .from("users")
            .select(
              "id, full_name, email, phone, role"
            )
            .in("id", userIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),

      vendorIds.length > 0
        ? supabase
            .from("vendor_profiles")
            .select(
              "id, user_id, business_name, email, phone"
            )
            .in("id", vendorIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),
    ]);

    if (usersResult.error) {
      console.error(
        "Manual payment user lookup error:",
        usersResult.error
      );
    }

    if (vendorsResult.error) {
      console.error(
        "Manual payment vendor lookup error:",
        vendorsResult.error
      );
    }

    const users =
      (usersResult.data || []) as UserProfile[];

    const vendors =
      (vendorsResult.data || []) as VendorProfile[];

    const enrichedRequests =
      paymentRequests.map((payment) => {
        const user = users.find(
          (item) => item.id === payment.user_id
        );

        const vendor = vendors.find(
          (item) => item.id === payment.vendor_id
        );

        return {
          ...payment,

          user: user
            ? {
                id: user.id,
                full_name:
                  user.full_name || null,
                email: user.email || null,
                phone: user.phone || null,
                role: user.role || null,
              }
            : null,

          vendor: vendor
            ? {
                id: vendor.id,
                business_name:
                  vendor.business_name || null,
                email: vendor.email || null,
                phone: vendor.phone || null,
              }
            : null,
        };
      });

    return NextResponse.json({
      success: true,
      data: enrichedRequests,
      count: enrichedRequests.length,
      status: requestedStatus,
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
 * PATCH
 *
 * Approve or reject a manual payment request.
 *
 * Body:
 * {
 *   requestId: string,
 *   action: "approve" | "reject",
 *   adminNote?: string
 * }
 *
 * Security:
 * - Admin identity comes from the bearer token.
 * - user_id/vendor_id come from the database request.
 * - Client cannot choose which vendor gets activated.
 * - Rejection never activates a subscription.
 * - Pro activation only occurs after explicit admin approval.
 */
export async function PATCH(request: Request) {
  try {
    const admin = await authenticateAdmin(request);

    if (!admin) {
      return NextResponse.json(
        {
          error: "Admin authentication required",
        },
        { status: 401 }
      );
    }

    let body: {
      requestId?: unknown;
      action?: unknown;
      adminNote?: unknown;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: "Invalid JSON request body",
        },
        { status: 400 }
      );
    }

    const requestId =
      typeof body.requestId === "string"
        ? body.requestId.trim()
        : "";

    const action: PaymentAction | null =
      body.action === "approve" ||
      body.action === "reject"
        ? body.action
        : null;

    const adminNote =
      typeof body.adminNote === "string"
        ? body.adminNote
            .trim()
            .slice(0, 2000)
        : "";

    if (!requestId) {
      return NextResponse.json(
        {
          error:
            "Payment request ID is required",
        },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        {
          error:
            "Action must be either approve or reject",
        },
        { status: 400 }
      );
    }

    const supabase = getDb();

    const {
      data: paymentData,
      error: paymentError,
    } = await supabase
      .from("manual_payment_requests")
      .select(
        `
          id,
          vendor_id,
          user_id,
          amount,
          currency,
          payment_reference,
          status
        `
      )
      .eq("id", requestId)
      .maybeSingle();

    if (paymentError) {
      console.error(
        "Payment request lookup error:",
        paymentError
      );

      return NextResponse.json(
        {
          error:
            "Failed to load the payment request",
        },
        { status: 500 }
      );
    }

    if (!paymentData) {
      return NextResponse.json(
        {
          error: "Payment request not found",
        },
        { status: 404 }
      );
    }

    const payment =
      paymentData as ManualPaymentRequest;

    if (payment.status !== "pending") {
      return NextResponse.json(
        {
          error:
            `This payment request has already been ${payment.status}.`,
          status: payment.status,
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

    /**
     * REJECT
     *
     * No subscription changes are made.
     */
    if (action === "reject") {
      const {
        data: rejectedRequest,
        error: rejectionError,
      } = await supabase
        .from("manual_payment_requests")
        .update({
          status: "rejected",
          reviewed_at: now,
          reviewed_by: admin.id,
          admin_note: adminNote || null,
          updated_at: now,
        })
        .eq("id", payment.id)
        .eq("status", "pending")
        .select()
        .maybeSingle();

      if (rejectionError) {
        console.error(
          "Payment rejection error:",
          rejectionError
        );

        return NextResponse.json(
          {
            error:
              "Failed to reject payment request",
          },
          { status: 500 }
        );
      }

      if (!rejectedRequest) {
        return NextResponse.json(
          {
            error:
              "Payment request was already processed.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json({
        success: true,
        action: "rejected",
        message:
          "Manual payment request rejected.",
      });
    }

    /**
     * APPROVE
     *
     * Conditional pending -> approved transition.
     * This prevents the same request from being approved
     * twice through normal concurrent admin actions.
     */
    const {
      data: approvedRequest,
      error: approvalError,
    } = await supabase
      .from("manual_payment_requests")
      .update({
        status: "approved",
        reviewed_at: now,
        reviewed_by: admin.id,
        admin_note: adminNote || null,
        updated_at: now,
      })
      .eq("id", payment.id)
      .eq("status", "pending")
      .select()
      .maybeSingle();

    if (approvalError) {
      console.error(
        "Payment approval error:",
        approvalError
      );

      return NextResponse.json(
        {
          error:
            "Failed to approve payment request",
        },
        { status: 500 }
      );
    }

    if (!approvedRequest) {
      return NextResponse.json(
        {
          error:
            "Payment request was already processed.",
        },
        { status: 409 }
      );
    }

    /**
     * The IDs below are taken directly from the
     * server-side payment record.
     */
    const userId = payment.user_id;
    const vendorId = payment.vendor_id;

    const activationStart = new Date();
    const activationEnd = new Date(
      activationStart
    );

    activationEnd.setDate(
      activationEnd.getDate() + 30
    );

    /**
     * Find the user's existing Pro subscription.
     */
    const {
      data: existingSubscriptionData,
      error: subscriptionLookupError,
    } = await supabase
      .from("subscriptions")
      .select(
        `
          id,
          user_id,
          vendor_id,
          tier,
          status
        `
      )
      .eq("user_id", userId)
      .eq("tier", "pro")
      .maybeSingle();

    if (subscriptionLookupError) {
      console.error(
        "Subscription lookup after approval failed:",
        subscriptionLookupError
      );

      return NextResponse.json(
        {
          error:
            "Payment was approved, but Pro activation could not be completed. Please retry the activation from the admin panel.",
          paymentApproved: true,
          activated: false,
        },
        { status: 500 }
      );
    }

    const existingSubscription =
      existingSubscriptionData as
        | {
            id: string;
            user_id: string;
            vendor_id: string;
            tier: string;
            status: string;
          }
        | null;

    /**
     * Manual payments have no Paystack identifiers.
     */
    const subscriptionData = {
      vendor_id: vendorId,
      user_id: userId,

      paystack_customer_code: null,
      paystack_subscription_code: null,
      paystack_plan_code: null,

      tier: "pro",
      status: "active",

      price_paid: Number(payment.amount),
      currency:
        payment.currency || "NGN",

      current_period_start:
        activationStart.toISOString(),

      current_period_end:
        activationEnd.toISOString(),

      updated_at:
        activationStart.toISOString(),
    };

    let subscriptionError: unknown = null;

    if (existingSubscription?.id) {
      const {
        error,
      } = await supabase
        .from("subscriptions")
        .update(subscriptionData)
        .eq(
          "id",
          existingSubscription.id
        );

      subscriptionError = error;
    } else {
      const {
        error,
      } = await supabase
        .from("subscriptions")
        .insert(subscriptionData);

      subscriptionError = error;
    }

    if (subscriptionError) {
      console.error(
        "Pro subscription activation error:",
        subscriptionError
      );

      return NextResponse.json(
        {
          error:
            "Payment was approved, but Pro activation failed. Please retry activation.",
          paymentApproved: true,
          activated: false,
        },
        { status: 500 }
      );
    }

    /**
     * Keep vendor_profiles.subscription_status
     * synchronized with the activated subscription.
     */
    const {
      error: vendorUpdateError,
    } = await supabase
      .from("vendor_profiles")
      .update({
        subscription_status: "active",
        updated_at:
          activationStart.toISOString(),
      })
      .eq("id", vendorId);

    if (vendorUpdateError) {
      console.error(
        "Vendor subscription status update error:",
        vendorUpdateError
      );

      /**
       * The actual Pro subscription was successfully
       * activated, so do not tell the admin that payment
       * activation failed.
       */
      return NextResponse.json({
        success: true,
        action: "approved",
        paymentApproved: true,
        activated: true,
        profileUpdated: false,
        warning:
          "Pro was activated, but the vendor profile status could not be updated.",
      });
    }

    return NextResponse.json({
      success: true,
      action: "approved",
      paymentApproved: true,
      activated: true,
      profileUpdated: true,
      message:
        "Manual payment approved and Pro subscription activated.",
    });
  } catch (error) {
    console.error(
      "Manual payment PATCH error:",
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
