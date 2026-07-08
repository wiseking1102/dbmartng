import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSecretKey } from "@/lib/paystack/keys";

const PAYSTACK_API = "https://api.paystack.co";

/**
 * GET /api/paystack/reconcile
 *
 * Scheduled reconciliation job (called by keep-alive workflow or cron).
 * Checks ALL "pro"/"active" subscriptions against Paystack API and syncs status.
 *
 * Also performs a dry-run check: pass ?dryRun=true to see what would change
 * without making any updates.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get("dryRun") === "true";

    // Verify cron secret to prevent unauthorized access
    const cronSecret = request.headers.get("x-cron-secret");
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const secretKey = await getSecretKey();
    if (!secretKey) {
      return NextResponse.json(
        { error: "Paystack secret key not configured" },
        { status: 500 }
      );
    }

    const adminClient = createAdminClient();

    // Get all active pro subscriptions that have a paystack subscription code
    const { data: subscriptions, error: subError } = await (adminClient
      .from("subscriptions")
      .select("id, user_id, paystack_subscription_code, status, current_period_end")
      .eq("tier", "pro")
      .in("status", ["active", "past_due", "payment_failed"]) as never) as unknown as { data: { id: string; user_id: string; paystack_subscription_code: string | null; status: string; current_period_end: string }[] | null; error: any };

    if (subError) {
      console.error("[paystack/reconcile] Fetch error:", subError);
      return NextResponse.json(
        { error: "Failed to fetch subscriptions" },
        { status: 500 }
      );
    }

    const results: {
      userId: string;
      paystackStatus: string;
      localStatus: string;
      changed: boolean;
      error?: string;
    }[] = [];

    // Check each subscription against Paystack API
    for (const sub of subscriptions || []) {
      if (!sub.paystack_subscription_code) {
        results.push({
          userId: sub.user_id,
          paystackStatus: "N/A",
          localStatus: sub.status,
          changed: false,
          error: "No paystack_subscription_code",
        });
        continue;
      }

      try {
        const response = await fetch(
          `${PAYSTACK_API}/subscription/${sub.paystack_subscription_code}`,
          {
            headers: {
              Authorization: `Bearer ${secretKey}`,
            },
          }
        );

        if (!response.ok) {
          results.push({
            userId: sub.user_id,
            paystackStatus: "ERROR",
            localStatus: sub.status,
            changed: false,
            error: `Paystack API returned ${response.status}`,
          });
          continue;
        }

        const result = await response.json();

        if (!result.status || !result.data) {
          results.push({
            userId: sub.user_id,
            paystackStatus: "INVALID",
            localStatus: sub.status,
            changed: false,
            error: result.message || "Invalid response from Paystack",
          });
          continue;
        }

        const psSub = result.data;
        const paystackStatus = psSub.status;

        // Map Paystack status to local status
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

        const changed = newStatus !== sub.status;

        if (changed && !dryRun) {
          // Update subscription record
          await adminClient
            .from("subscriptions")
            .update({
              status: newStatus,
              current_period_end: psSub.next_payment_date
                ? new Date(psSub.next_payment_date).toISOString()
                : sub.current_period_end,
            } as never)
            .eq("id", (sub as unknown as { id: string }).id);

          // Update vendor profile accordingly
          const profileStatus =
            newStatus === "active"
              ? "pro"
              : ["cancelled", "payment_failed"].includes(newStatus)
                ? "free"
                : "payment_failed";

          await adminClient
            .from("vendor_profiles")
            .update({
              subscription_status: profileStatus,
            } as never)
            .eq("user_id", (sub as unknown as { user_id: string }).user_id);
        }

        results.push({
          userId: sub.user_id,
          paystackStatus,
          localStatus: sub.status,
          changed,
        });
      } catch (err) {
        results.push({
          userId: sub.user_id,
          paystackStatus: "ERROR",
          localStatus: sub.status,
          changed: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    const changedCount = results.filter((r) => r.changed).length;

    return NextResponse.json({
      success: true,
      dryRun,
      total: subscriptions?.length || 0,
      changed: changedCount,
      results,
    });
  } catch (err) {
    console.error("[paystack/reconcile] Error:", err);
    return NextResponse.json(
      { error: "Reconciliation failed" },
      { status: 500 }
    );
  }
}
