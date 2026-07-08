import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { toKobo, fromKobo, ALL_PAYMENT_CHANNELS } from "@/lib/paystack";
import { getSecretKey } from "@/lib/paystack/keys";
import { randomBytes } from "crypto";

const PAYSTACK_API = "https://api.paystack.co";

// ─── POST: Initialize subscription checkout ───
export async function POST(request: Request) {
  try {
    const { userId, email, planCode, price } = await request.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: "userId and email are required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Get vendor profile
    const { data: vendorProfile } = await (adminClient
      .from("vendor_profiles")
      .select("id, subscription_status")
      .eq("user_id", userId)
      .single() as never) as unknown as { data: { id: string; subscription_status: string } | null };

    if (!vendorProfile) {
      return NextResponse.json(
        { error: "Vendor profile not found" },
        { status: 404 }
      );
    }

    const secretKey = await getSecretKey();

    // Generate unique reference
    const reference = `DBM-${userId.slice(0, 8)}-${Date.now()}`;

    // Get or create Paystack customer (check if exists first)
    let customerCode: string;
    
    // Search for existing customer by email
    const searchResponse = await fetch(
      `${PAYSTACK_API}/customer?email=${encodeURIComponent(email)}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      }
    );
    const searchData = await searchResponse.json();
    
    if (searchData.status && searchData.data?.length > 0) {
      customerCode = searchData.data[0].customer_code;
    } else {
      // Create new customer
      const customerResponse = await fetch(
        `${PAYSTACK_API}/customer`,
        {
          method: "POST",      headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          metadata: { userId },
        }),
      });
      const customerData = await customerResponse.json();
      if (!customerData.status) {
        return NextResponse.json(
          { error: "Failed to create Paystack customer" },
          { status: 500 }
        );
      }
      customerCode = customerData.data.customer_code;
    }

    // Initialize subscription transaction
    const amount = price ? toKobo(price) : toKobo(5000); // default 5000 NGN
    const channels = [...ALL_PAYMENT_CHANNELS];

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
          amount,
          plan: planCode || undefined,
          channels,
          reference,
          metadata: {
            userId,
            vendorId: vendorProfile.id,
            type: "subscription",
          },
        }),
      }
    );
    const txnData = await txnResponse.json();

    if (!txnData.status) {
      return NextResponse.json(
        { error: txnData.message || "Failed to initialize payment" },
        { status: 500 }
      );
    }

    // Create a pending subscription record so we have the customer code
    await adminClient
      .from("subscriptions")
      .insert({
        vendor_id: vendorProfile.id,
        user_id: userId,
        paystack_customer_code: customerCode,
        tier: "pro",
        status: "active",
        price_paid: price || 5000,
        currency: "NGN",
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
      } as never)
      .select()
      .maybeSingle();

    return NextResponse.json({
      success: true,
      data: {
        authorization_url: txnData.data.authorization_url,
        reference,
        access_code: txnData.data.access_code,
        customer_code: customerCode,
      },
    });
  } catch (err) {
    console.error("Subscription init error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PUT: Force re-sync subscription from Paystack ───
export async function PUT(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const secretKey = await getSecretKey();
    const adminClient = createAdminClient();

    // Get vendor's subscription record
    const { data: sub } = await (adminClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("tier", "pro")
      .single() as never) as unknown as { data: { paystack_subscription_code: string | null } | null };

    if (!sub?.paystack_subscription_code) {
      return NextResponse.json(
        { error: "No Paystack subscription found for this vendor" },
        { status: 404 }
      );
    }

    // Query Paystack for current status
    const response = await fetch(
      `${PAYSTACK_API}/subscription/${sub.paystack_subscription_code}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      }
    );
    const result = await response.json();

    if (!result.status) {
      return NextResponse.json(
        { error: "Failed to fetch subscription from Paystack" },
        { status: 500 }
      );
    }

    const psSub = result.data;
    const paystackStatus = psSub.status; // active, cancelled, etc.

    // Map Paystack status to our status
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
    }

    // Update subscription record
    await adminClient
      .from("subscriptions")
      .update({
        status: newStatus,
        current_period_end: psSub.next_payment_date
          ? new Date(psSub.next_payment_date).toISOString()
          : undefined,
      } as never)
      .eq("id", (sub as unknown as { id: string }).id);

    // Update vendor profile status
    const profileStatus =
      newStatus === "active"
        ? "pro"
        : newStatus === "cancelled" || newStatus === "payment_failed"
          ? "free"
          : "payment_failed";

    await adminClient
      .from("vendor_profiles")
      .update({
        subscription_status: profileStatus,
      } as never)
      .eq("user_id", userId);

    return NextResponse.json({
      success: true,
      data: {
        paystack_status: paystackStatus,
        local_status: newStatus,
        profile_status: profileStatus,
      },
    });
  } catch (err) {
    console.error("Subscription re-sync error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
