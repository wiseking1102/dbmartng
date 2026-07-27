import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    interface SubItem {
      id: string;
      user_id: string;
      vendor_id: string;
      paystack_subscription_code: string | null;
      status: string;
    }

    const { data: rawSubs, error } = await adminClient
      .from("subscriptions")
      .select("id, user_id, vendor_id, paystack_subscription_code, status")
      .eq("status", "active");

    const subs = (rawSubs as unknown as SubItem[]) || null;

    if (error) {
      console.error("Subscription fetch error for reconciliation:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    let reconciledCount = 0;
    let mismatchCount = 0;

    if (paystackSecretKey && subs) {
      for (const sub of subs) {
        if (!sub.paystack_subscription_code) continue;

        try {
          const res = await fetch(
            `https://api.paystack.co/subscription/${sub.paystack_subscription_code}`,
            {
              headers: {
                Authorization: `Bearer ${paystackSecretKey}`,
              },
            }
          );

          if (res.ok) {
            const paystackData = await res.json();
            const remoteStatus = paystackData.data?.status;

            if (remoteStatus && remoteStatus !== "active" && remoteStatus !== "complete") {
              mismatchCount++;
              // Update local database status
              await adminClient
                .from("subscriptions")
                .update({ status: "cancelled" } as never)
                .eq("id", sub.id);

              await adminClient
                .from("vendor_profiles")
                .update({ subscription_status: "free" } as never)
                .eq("user_id", sub.user_id);

              // Log system alert
              await adminClient.from("system_alerts").insert({
                source: "reconciliation_cron",
                error_detail: `Reconciliation mismatch resolved for vendor ${sub.vendor_id}: Paystack status was ${remoteStatus}`,
                severity: "warning",
              } as never);
            } else {
              reconciledCount++;
            }
          }
        } catch (err) {
          console.error(`Reconciliation error for sub ${sub.id}:`, err);
        }
      }
    }

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      checked: subs?.length ?? 0,
      reconciled: reconciledCount,
      mismatchesResolved: mismatchCount,
    });
  } catch (err) {
    console.error("Reconciliation job error:", err);
    return NextResponse.json({ error: "Reconciliation failed" }, { status: 500 });
  }
}
