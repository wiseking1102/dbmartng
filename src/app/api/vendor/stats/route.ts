import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * GET /api/vendor/stats
 *
 * Authoritative vendor dashboard statistics for the authenticated
 * vendor. All identity is resolved server-side from the session —
 * the browser cannot request another vendor's numbers.
 *
 * Shape (consumed by /dashboard/vendor and /dashboard/vendor/analytics):
 * {
 *   profileViews, listingViews, totalListings,
 *   messagesUnread, subscriptionStatus, trialEndsAt
 * }
 */
export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const admin = createAdminClient();

    /* Only vendors may read vendor statistics. */
    const { data: roleData } = await admin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = (roleData as { role?: string } | null)?.role;

    if (role !== "vendor") {
      return NextResponse.json(
        { error: "Vendor access required" },
        { status: 403 }
      );
    }

    const ip = getClientIp(request);
    const allowed = await consumeRateLimit(ip, "vendor_stats", 60, 1);

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    const { data: vendorData } = await admin
      .from("vendor_profiles")
      .select(
        "id, slug, subscription_status, trial_decision_made, trial_decision, trial_ends_at"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    const vendor = (vendorData as unknown as {
      id: string;
      slug: string;
      subscription_status: string;
      trial_decision_made: boolean;
      trial_decision: string | null;
      trial_ends_at: string;
    } | null) || null;

    if (!vendor) {
      return NextResponse.json(
        { error: "Vendor profile not found" },
        { status: 404 }
      );
    }

    /* Listing stats (views are the authoritative counter on listings). */
    const { data: listingRows } = await admin
      .from("listings")
      .select("id, view_count, status")
      .eq("vendor_id", vendor.id);

    const listings =
      (listingRows as unknown as
        | { id: string; view_count: number | null; status: string }[]
        | null) || [];

    const totalListings = listings.length;
    const listingViews = listings.reduce(
      (sum, listing) => sum + (listing.view_count || 0),
      0
    );

    /* Unread buyer messages addressed to this vendor account. */
    const { count: messagesUnread } = await admin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("receiver_id", user.id)
      .eq("is_read", false);

    /*
     * Profile views are recorded as social_activities events with
     * activity_type "profile_view" and metadata.vendor_id set by
     * /api/history POST. Count them for vendor analytics.
     */
    const { count: profileViews } = await admin
      .from("social_activities")
      .select("id", { count: "exact", head: true })
      .eq("activity_type", "profile_view")
      .eq("metadata->>vendor_id", vendor.id)
      .is("metadata->>buyer_id", "not, null");

    /* Subscription state from the vendor profile + subscriptions. */
    const { data: subscriptionRow } = await admin
      .from("subscriptions")
      .select("status, tier, current_period_end")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const subscription = (subscriptionRow as unknown as {
      status: string;
      tier: string;
      current_period_end: string | null;
    } | null) || null;

    let subscriptionStatus: string = vendor.subscription_status || "free";

    if (
      subscription &&
      subscription.tier === "pro" &&
      subscription.status === "active"
    ) {
      const periodEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end).getTime()
        : 0;

      subscriptionStatus =
        periodEnd > Date.now() ? "pro" : "expired";
    }

    return NextResponse.json({
      success: true,
      data: {
        profileViews: profileViews || 0,
        listingViews,
        totalListings,
        messagesUnread: messagesUnread || 0,
        subscriptionStatus,
        trialEndsAt: vendor.trial_ends_at || null,
      },
    });
  } catch (error) {
    console.error("Vendor stats API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
