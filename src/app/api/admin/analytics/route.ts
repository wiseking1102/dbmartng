import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    // Verify admin role
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: profile } = await (adminClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single() as never) as unknown as { data: { role: string } | null };

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Run all queries in parallel
    const [vendorsResult, listingsResult, subsResult, pendingResult, reviewsResult, categoryCounts] =
      await Promise.all([
        // Total vendors (distinct users with vendor role)
        adminClient
          .from("users")
          .select("id", { count: "exact", head: true })
          .eq("role", "vendor"),
        // Total approved listings
        adminClient
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("status", "approved"),
        // Pro subscriptions
        adminClient
          .from("vendor_profiles")
          .select("id", { count: "exact", head: true })
          .eq("subscription_status", "pro"),
        // Pending reviews
        adminClient
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending_review"),
        // Total reviews
        adminClient
          .from("reviews")
          .select("id", { count: "exact", head: true }),
        // Category distribution — single query with join count
        adminClient.rpc("get_category_vendor_counts" as never) as unknown as Promise<{ data: { name: string; count: number }[] | null; error: any }>,
      ]);

    let categoryBreakdown: { name: string; count: number }[] = [];

    // If the RPC function doesn't exist yet, fall back to in-app aggregation
    if (categoryCounts?.error) {
      // Fetch categories and their vendor counts in a single client-side aggregation
      const { data: categories } = await adminClient
        .from("categories")
        .select("name, id")
        .eq("is_active", true);

      if (categories) {
        const { data: vendorCounts } = await (adminClient
          .from("vendor_profiles")
          .select("category_id") as never) as unknown as { data: { category_id: string | null }[] | null };

        if (vendorCounts) {
          const countMap = new Map<string, number>();
          for (const v of vendorCounts) {
            if (v.category_id) {
              countMap.set(v.category_id, (countMap.get(v.category_id) || 0) + 1);
            }
          }
          const cats = categories as unknown as { name: string; id: string }[];
          categoryBreakdown = cats.map((c) => ({
            name: c.name,
            count: countMap.get(c.id) || 0,
          }));
        }
      }
    } else if (categoryCounts?.data) {
      categoryBreakdown = categoryCounts.data;
    }

    // Get recent signups (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { count: newVendors } = await adminClient
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "vendor")
      .gte("created_at", sevenDaysAgo);

    // Get new listings this week
    const { count: newListings } = await adminClient
      .from("listings")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo);

    // Get average rating
    const { data: avgRating } = await adminClient
      .from("reviews")
      .select("rating") as never as unknown as { data: { rating: number }[] | null };

    const averageRating =
      avgRating && avgRating.length > 0
        ? avgRating.reduce((sum: number, r) => sum + r.rating, 0) / avgRating.length
        : 0;

    // Get total messages sent
    const { count: totalMessages } = await adminClient
      .from("messages")
      .select("id", { count: "exact", head: true });

    // Get open reports/complaints
    const { count: openComplaints } = await adminClient
      .from("vendor_complaints")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "investigating"]);

    // Monthly revenue estimate (from pro subscriptions)
    const { data: proVendors } = await adminClient
      .from("vendor_profiles")
      .select("id")
      .eq("subscription_status", "pro");

    const proCount = proVendors?.length || 0;
    const monthlyRevenue = proCount * 5000; // 5000 NGN/month per pro vendor

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalVendors: vendorsResult.count || 0,
          activeListings: listingsResult.count || 0,
          proSubscriptions: subsResult.count || 0,
          pendingReviews: pendingResult.count || 0,
          totalReviews: reviewsResult.count || 0,
          totalMessages: totalMessages || 0,
          openComplaints: openComplaints || 0,
          averageRating: Math.round(averageRating * 10) / 10,
        },
        trends: {
          newVendorsThisWeek: newVendors || 0,
          newListingsThisWeek: newListings || 0,
        },
        revenue: {
          monthlyEstimateNaira: monthlyRevenue,
          proVendorCount: proCount,
        },
        categories: categoryBreakdown,
      },
    });
  } catch (err) {
    console.error("[admin/analytics] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
