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

type ApprovalRpcResult = {
  success: boolean;
  error?: string;
  status?: string;
  action?: string;
  message?: string;
  period_end?: string;
};

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
 * Approve or reject a manual payment request by calling the
 * authoritative database function `approve_manual_payment()`.
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
 * - Pro activation only occurs after explicit review approval.
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
      body.action === "approve" || body.action === "reject"
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
          error: "Payment request ID is required",
        },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        {
          error: "Action must be either approve or reject",
        },
        { status: 400 }
      );
    }

    const supabase = getDb();

    /*
     * Light pre-check so obviously-invalid requests fail
     * with a clear message. The authoritative state and
     * permission checks happen inside the RPC.
     */
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
          error: "Failed to load the payment request",
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

    /*
     * Safe cast through unknown:
     * the generated types can lag behind migrations.
     */
    const payment =
      paymentData as unknown as ManualPaymentRequest;

    /*
     * REJECT — handled here with a single atomic, guarded statement.
     *
     * Rejection never touches the subscription.
     */
    if (action === "reject") {
      const { data: rejectedData, error: rejectError } =
        await supabase
          .from("manual_payment_requests")
          .update({
            status: "rejected",
            reviewed_at: new Date().toISOString(),
            reviewed_by: admin.id,
            admin_note: adminNote || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", payment.id)
          .eq("status", "pending")
          .select("id, user_id")
          .maybeSingle();

      if (rejectError) {
        console.error(
          "Manual payment rejection failed:",
          rejectError
        );

        return NextResponse.json(
          {
            error:
              "Failed to process the payment request. Please try again.",
          },
          { status: 500 }
        );
      }

      const rejectedRow =
        (rejectedData as unknown as
          | { id: string; user_id: string }
          | null) || null;

      if (!rejectedRow) {
        return NextResponse.json(
          {
            error:
              "This payment request has already been processed.",
            status: payment.status,
          },
          { status: 409 }
        );
      }

      /*
       * Audit log + vendor notification (best effort).
       */
      try {
        await supabase.from("admin_audit_log").insert({
          admin_user_id: admin.id,
          action: "manual_payment_rejected",
          target_id: payment.id,
          old_value: { status: "pending" } as never,
          new_value: {
            status: "rejected",
            amount: payment.amount,
            currency: payment.currency,
          } as never,
        } as never);
      } catch (auditError) {
        console.error(
          "Rejection audit log failed:",
          auditError
        );
      }

      try {
        await supabase.from("notifications").insert({
          user_id: rejectedRow.user_id,
          type: "payment_rejected",
          title: "Payment request rejected",
          body:
            "Your manual payment request could not be verified. Please contact support or resubmit with a valid payment reference.",
        } as never);
      } catch (notifyError) {
        console.error(
          "Rejection vendor notification failed:",
          notifyError
        );
      }

      return NextResponse.json({
        success: true,
        action: "rejected",
        paymentApproved: false,
        activated: false,
        profileUpdated: false,
        message: "Manual payment request rejected.",
        period_end: null,
      });
    }

    /*
     * APPROVE — single authoritative database transaction via RPC.
     */
    const { data: rpcData, error: rpcError } =
      await supabase.rpc("approve_manual_payment", {
        p_request_id: payment.id,
        p_admin_id: admin.id,
        p_admin_note: adminNote || null,
      });

    if (rpcError) {
      console.error(
        "approve_manual_payment RPC error:",
        rpcError
      );

      return NextResponse.json(
        {
          error:
            "Failed to process the payment request. Please try again.",
        },
        { status: 500 }
      );
    }

    const result =
      (rpcData as unknown as ApprovalRpcResult) || null;

    if (!result?.success) {
      const alreadyProcessed =
        typeof result?.status === "string" &&
        result.status !== "pending";

      return NextResponse.json(
        {
          error:
            result?.error ||
            "Failed to process the payment request.",
          status: result?.status,
        },
        { status: alreadyProcessed ? 409 : 400 }
      );
    }

    /*
     * Post-verification: the subscription must be active for the
     * vendor the payment belongs to.
     */
    try {
      await supabase
        .from("manual_payment_requests")
        .select("id, status")
        .eq("id", payment.id)
        .maybeSingle()
        .then(
          async ({
            data: approvedRow,
          }: {
            data: unknown;
          }) => {
            const approved = (
              approvedRow as unknown as {
                id: string;
                status: string;
              } | null
            )?.status;

            if (approved !== "approved") return;

            const { data: subRow } = await supabase
              .from("subscriptions")
              .select("id, status, current_period_end")
              .eq("user_id", payment.user_id)
              .eq("tier", "pro")
              .maybeSingle();

            const sub = (
              subRow as unknown as
                | {
                    id: string;
                    status: string;
                    current_period_end: string | null;
                  }
                | null
            ) || null;

            const alreadyActive =
              sub?.status === "active" &&
              sub?.current_period_end &&
              new Date(sub.current_period_end).getTime() >
                Date.now();

            if (alreadyActive) return;

            const periodStart = new Date();
            const periodEnd = new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            );

            if (sub) {
              await supabase
                .from("subscriptions")
                .update({
                  tier: "pro",
                  status: "active",
                  price_paid: payment.amount,
                  currency: payment.currency || "NGN",
                  current_period_start:
                    periodStart.toISOString(),
                  current_period_end:
                    periodEnd.toISOString(),
                  cancelled_at: null,
                  updated_at: periodStart.toISOString(),
                  vendor_id: payment.vendor_id,
                  user_id: payment.user_id,
                } as never)
                .eq("id", sub.id);
            } else {
              await supabase.from("subscriptions").insert({
                vendor_id: payment.vendor_id,
                user_id: payment.user_id,
                paystack_customer_code: null,
                paystack_subscription_code: null,
                paystack_plan_code: null,
                tier: "pro",
                status: "active",
                price_paid: payment.amount,
                currency: payment.currency || "NGN",
                current_period_start:
                  periodStart.toISOString(),
                current_period_end:
                  periodEnd.toISOString(),
              } as never);
            }

            await supabase
              .from("vendor_profiles")
              .update({
                subscription_status: "pro",
                updated_at: periodStart.toISOString(),
              } as never)
              .eq("id", payment.vendor_id);

            try {
              await supabase.from("notifications").insert({
                user_id: payment.user_id,
                type: "payment_approved",
                title: "Pro subscription activated",
                body:
                  "Your Pro subscription is now active for 30 days.",
              } as never);
            } catch {
              /* non-fatal */
            }
          }
        );
    } catch (verifyError) {
      console.error(
        "Post-activation verification error:",
        verifyError
      );

      /*
       * Verification is best-effort; the RPC result still stands.
       */
    }

    return NextResponse.json({
      success: true,
      action: "approved",
      paymentApproved: true,
      activated: true,
      profileUpdated: true,
      message:
        result.message ||
        "Manual payment approved and Pro subscription activated.",
      period_end: result.period_end || null,
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
