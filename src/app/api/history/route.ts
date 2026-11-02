import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * Buyer view-history storage.
 *
 * History rows are social_activities records with
 *   activity_type = "profile_view"
 *   metadata = { buyer_id, vendor_id }
 * written when a buyer opens a vendor profile / vendor page.
 *
 * GET /api/history
 * { id, vendor_id, business_name, slug, category, location,
 *   logo_url, viewed_at }[]
 *
 * POST /api/history
 * { vendorId } → records the signed-in buyer's profile view.
 *
 * DELETE /api/history
 * { clearAll: true } → clears the buyer's own history.
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

    const { data: roleData } = await admin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if ((roleData as { role?: string } | null)?.role !== "buyer") {
      return NextResponse.json(
        { error: "Buyer access required" },
        { status: 403 }
      );
    }

    const ip = getClientIp(request);
    const allowed = await consumeRateLimit(ip, "history_get", 60, 1);

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    const { data: activityRows, error } = await admin
      .from("social_activities")
      .select("id, created_at, metadata")
      .eq("activity_type", "profile_view")
      .eq("metadata->>buyer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("History lookup error:", error);
      return NextResponse.json(
        { error: "Failed to load history" },
        { status: 500 }
      );
    }

    const activities =
      (activityRows as unknown as
        | {
            id: string;
            created_at: string;
            metadata: { buyer_id?: string; vendor_id?: string } | null;
          }[]
        | null) || [];

    const vendorIds = Array.from(
      new Set(
        activities
          .map((row) => row.metadata?.vendor_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    const vendorById = new Map<
      string,
      {
        id: string;
        business_name: string;
        slug: string;
        city: string | null;
        state: string | null;
        logo_url: string | null;
        category_name: string | null;
      }
    >();

    if (vendorIds.length > 0) {
      const { data: vendorRows } = await admin
        .from("vendor_profiles")
        .select(
          `
          id,
          business_name,
          slug,
          city,
          state,
          logo_url,
          categories ( name )
        `
        )
        .in("id", vendorIds);

      const vendors =
        (vendorRows as unknown as
          | {
              id: string;
              business_name: string;
              slug: string;
              city: string | null;
              state: string | null;
              logo_url: string | null;
              categories: { name: string } | null;
            }[]
          | null) || [];

      for (const vendor of vendors) {
        vendorById.set(vendor.id, vendor);
      }
    }

    const data = activities
      .map((row) => {
        const vendorId = row.metadata?.vendor_id;
        const vendor = vendorId ? vendorById.get(vendorId) : null;

        if (!vendor) return null;

        const locationBits = [vendor.city, vendor.state].filter(Boolean);

        return {
          id: row.id,
          vendor_id: vendor.id,
          business_name: vendor.business_name,
          slug: vendor.slug,
          category: vendor.category_name || "General",
          location:
            locationBits.length > 0 ? locationBits.join(", ") : "Nigeria",
          logo_url: vendor.logo_url,
          viewed_at: row.created_at,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("History API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    const ip = getClientIp(request);
    const allowed = await consumeRateLimit(ip, "history_post", 60, 1);

    if (!allowed) {
      return NextResponse.json({ success: true, throttled: true });
    }

    const body = (await request.json().catch(() => null)) as {
      vendorId?: unknown;
    } | null;

    const vendorId =
      typeof body?.vendorId === "string" ? body.vendorId.trim() : "";

    if (!vendorId) {
      return NextResponse.json(
        { error: "vendorId is required" },
        { status: 400 }
      );
    }

    const { data: vendorRow } = await admin
      .from("vendor_profiles")
      .select("id")
      .eq("id", vendorId)
      .maybeSingle();

    if (!vendorRow) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      );
    }

    /* The activity feed stores actor identity as name/role; the
     * buyer/vendor pairing lives in metadata. */
    const { error: insertError } = await admin
      .from("social_activities")
      .insert({
        activity_type: "profile_view",
        actor_name: "buyer",
        target_type: "vendor_profile",
        target_url: `/vendors`,
        metadata: {
          buyer_id: user.id,
          vendor_id: vendorId,
        },
      } as unknown as never);

    if (insertError) {
      console.error("History recording failed:", insertError);
      return NextResponse.json(
        { error: "Failed to record view" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("History recording error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
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

    /* Ownership guard: buyer_id must match the session user. */
    const { error: deleteError } = await admin
      .from("social_activities")
      .delete()
      .eq("activity_type", "profile_view")
      .eq("metadata->>buyer_id", user.id);

    if (deleteError) {
      console.error("History clearing failed:", deleteError);
      return NextResponse.json(
        { error: "Failed to clear history" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("History clearing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
