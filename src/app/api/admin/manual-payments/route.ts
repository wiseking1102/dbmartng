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
    const supabase = createAdminClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError || !profile) {
      return null;
    }

    /*
     * The generated Supabase Database type can become stale when
     * migrations have changed the users table. Cast the returned
     * profile explicitly so TypeScript does not incorrectly infer
     * it as `never`.
     */
    const role = (
      profile as unknown as {
        role: string | null;
      }
    ).role;

    if (role !== "admin" && role !== "sub_admin") {
      return null;
    }

    return {
      id: user.id,
      role,
    };
  } catch (error) {
    console.error("Admin authentication error:", error);
    return null;
  }
}

/**
 * GET
 *
 * Returns manual payment requests for admins/sub-admins.
 *
 * Optional:
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

    const supabase = createAdminClient();
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
      query = query.eq("status", requestedStatus);
    }

    const { data: requests, error } = await query;

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
      (requests as unknown as ManualPaymentRequest[]) || [];

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

    const [usersResult, vendorsResult] =
      await Promise.all([
        userIds.length
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

        vendorIds.length
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
      (usersResult.data || []) as unknown as UserProfile[];

    const vendors =
      (vendorsResult.data || []) as unknown as VendorProfile[];

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
                full_name: user.full_name || null,
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
 * IMPORTANT:
 * - Authenticated admin comes from the bearer token.
 * - Payment request determines its own user/vendor.
 * - Client-supplied userId/vendorId are never trusted.
 * - Approval activates Pro only on the server.
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

    const action =
      body.action === "approve" ||
      body.action === "reject"
        ? body.action
        : null;

    const adminNote =
      typeof body.adminNote === "string"
        ? body.adminNote.trim().slice(0, 2000)
        : "";

    if (!requestId) {
      return NextResponse.json(
        {
          error: "Payment request ID is required",
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

    const supabase = createAdminClient();

    const {
      data: payment,
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

    if (!payment) {
      return NextResponse.json(
        {
          error: "Payment request not found",
        },
        { status: 404 }
      );
    }

    if (payment.status !== "pending") {
      return NextResponse.json(
        {
          error: `This payment request has already been ${payment.status}.`,
          status: payment.status,
        },
        { status: 409 }
      );
    }

    /*
     * REJECTION
     *
     * Rejection does not modify subscription access.
     */
    if (action === "reject") {
      const {
        data: rejectedRequest,
        error,
      } = await supabase
        .from("manual_payment_requests")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: admin.id,
          admin_note: adminNote || null,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", payment.id)
        .eq("status", "pending")
        .select()
        .maybeSingle();

      if (error) {
        console.error(
          "Payment rejection error:",
          error
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

    /*
     * APPROVAL
     *
     * First mark the payment as approved.
     * The conditional status=pending prevents
     * simultaneous/double approval.
     */
    const {
      data: approvedRequest,
      error: approvalError,
    } = await supabase
      .from("manual_payment_requests")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: admin.id,
        admin_note: adminNote || null,
        updated_at: new Date().toISOString(),
      } as never)
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

    /*
     * The payment has now been explicitly approved by
     * an authenticated admin.
     *
     * The user/vendor IDs below come exclusively from
     * the database payment request.
     */

    const now = new Date();

    const periodEnd = new Date(now);

    periodEnd.setDate(
      periodEnd.getDate() + 30
    );

    /*
     * Look for an existing Pro subscription.
     */
    const {
      data: existingSubscription,
      error: subLookupError,
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
      .eq("user_id", payment.user_id)
      .eq("tier", "pro")
      .maybeSingle();

    if (subLookupError) {
      console.error(
        "Subscription lookup after approval failed:",
        subLookupError
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

    const subscriptionData = {
      vendor_id: payment.vendor_id,
      user_id: payment.user_id,

      /*
       * Manual payments do not have Paystack
       * subscription identifiers.
       */
      paystack_customer_code: null,
      paystack_subscription_code: null,
      paystack_plan_code: null,

      tier: "pro",
      status: "active",

      price_paid: Number(payment.amount),
      currency: payment.currency || "NGN",

      current_period_start:
        now.toISOString(),

      current_period_end:
        periodEnd.toISOString(),

      updated_at: now.toISOString(),
    };

    let subscriptionError = null;

    if (existingSubscription?.id) {
      const { error } = await supabase
        .from("subscriptions")
        .update(subscriptionData as never)
        .eq(
          "id",
          existingSubscription.id
        );

      subscriptionError = error;
    } else {
      const { error } = await supabase
        .from("subscriptions")
        .insert(
          subscriptionData as never
        );

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

    /*
     * Update the vendor profile only after the
     * subscription itself has been activated.
     */
    const {
      error: vendorUpdateError,
    } = await supabase
      .from("vendor_profiles")
      .update({
        subscription_status: "active",
        updated_at: now.toISOString(),
      } as never)
      .eq("id", payment.vendor_id);

    if (vendorUpdateError) {
      console.error(
        "Vendor subscription status update error:",
        vendorUpdateError
      );

      /*
       * The subscription was successfully activated.
       * Do not report the entire operation as failed.
       * The admin can repair the profile status without
       * charging the vendor again.
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