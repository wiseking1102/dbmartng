import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getAdminUser(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader
    .slice("Bearer ".length)
    .trim();

  if (!token) return null;

  const adminClient = createAdminClient();

  const {
    data: { user },
  } = await adminClient.auth.getUser(token);

  if (!user) return null;

  const { data: profile } = await adminClient
    .from("users")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !profile ||
    !["admin", "sub_admin"].includes(profile.role)
  ) {
    return null;
  }

  return user;
}

export async function GET(request: Request) {
  const adminUser = await getAdminUser(request);

  if (!adminUser) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 }
    );
  }

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("manual_payment_requests")
    .select(`
      *,
      vendor_profiles (
        business_name,
        user_id
      )
    `)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Manual payment request fetch failed:",
      error
    );

    return NextResponse.json(
      { error: "Failed to load payment requests" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data,
  });
}

export async function PATCH(request: Request) {
  const adminUser = await getAdminUser(request);

  if (!adminUser) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    const requestId = body?.requestId;
    const decision = body?.decision;
    const adminNote =
      typeof body?.adminNote === "string"
        ? body.adminNote.trim()
        : null;

    if (!requestId) {
      return NextResponse.json(
        { error: "Payment request ID is required" },
        { status: 400 }
      );
    }

    if (!["approved", "rejected"].includes(decision)) {
      return NextResponse.json(
        {
          error:
            "Decision must be approved or rejected",
        },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    const { data: paymentRequest, error: fetchError } =
      await adminClient
        .from("manual_payment_requests")
        .select("*")
        .eq("id", requestId)
        .maybeSingle();

    if (fetchError) {
      return NextResponse.json(
        { error: "Failed to load payment request" },
        { status: 500 }
      );
    }

    if (!paymentRequest) {
      return NextResponse.json(
        { error: "Payment request not found" },
        { status: 404 }
      );
    }

    if (paymentRequest.status !== "pending") {
      return NextResponse.json(
        {
          error:
            "This payment request has already been reviewed.",
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

    const { error: updateError } = await adminClient
      .from("manual_payment_requests")
      .update({
        status: decision,
        reviewed_at: now,
        reviewed_by: adminUser.id,
        admin_note: adminNote,
        updated_at: now,
      })
      .eq("id", requestId)
      .eq("status", "pending");

    if (updateError) {
      console.error(
        "Payment request update failed:",
        updateError
      );

      return NextResponse.json(
        { error: "Failed to update payment request" },
        { status: 500 }
      );
    }

    /*
     * REJECTED:
     * Stop here. Pro remains inactive.
     */
    if (decision === "rejected") {
      return NextResponse.json({
        success: true,
        status: "rejected",
        message: "Payment request rejected.",
      });
    }

    /*
     * APPROVED:
     * Activate Pro only now.
     */
    const { error: subscriptionError } =
      await adminClient
        .from("subscriptions")
        .upsert(
          {
            vendor_id: paymentRequest.vendor_id,
            user_id: paymentRequest.user_id,
            tier: "pro",
            status: "active",
            price_paid: paymentRequest.amount,
            currency: paymentRequest.currency,
          } as never,
          {
            onConflict: "user_id",
          }
        );

    if (subscriptionError) {
      console.error(
        "Subscription activation failed:",
        subscriptionError
      );

      /*
       * Do not pretend approval completed successfully
       * if Pro activation failed.
       */
      return NextResponse.json(
        {
          error:
            "Payment was approved, but Pro activation failed. Please retry the activation.",
        },
        { status: 500 }
      );
    }

    const { error: vendorError } =
      await adminClient
        .from("vendor_profiles")
        .update({
          subscription_status: "pro",
        })
        .eq("id", paymentRequest.vendor_id);

    if (vendorError) {
      console.error(
        "Vendor profile activation failed:",
        vendorError
      );

      return NextResponse.json(
        {
          error:
            "Subscription activated, but vendor profile status could not be updated.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      status: "approved",
      message:
        "Payment approved and Pro subscription activated.",
    });
  } catch (error) {
    console.error(
      "Admin manual payment API error:",
      error
    );

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}