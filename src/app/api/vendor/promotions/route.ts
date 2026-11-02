import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * GET /api/vendor/promotions
 *
 * Returns the authenticated vendor's promotion campaigns.
 * Data lives in `ad_requests` — the vendor-side promotions page
 * maps the rows to its own campaign shape.
 *
 * POST /api/vendor/promotions
 *
 * Creates a new promotion request (pending admin review). The
 * vendor can never activate a campaign themselves — pending is the
 * only vendor-writable status, publication is admin-only.
 */
type CampaignStatus = "active" | "paused" | "ended" | "pending";

function mapStatus(
  status: string,
  endsAt: string | null,
  startsAt: string | null
): CampaignStatus {
  if (status === "pending" || status === "rejected") {
    return "pending";
  }

  if (status === "paused") {
    return "paused";
  }

  if (status === "active") {
    const now = Date.now();
    const ends = endsAt ? new Date(endsAt).getTime() : 0;
    const starts = startsAt ? new Date(startsAt).getTime() : 0;

    if (starts > now) {
      return "pending";
    }

    if (ends > 0 && ends < now) {
      return "ended";
    }

    return "active";
  }

  if (status === "approved" || status === "completed") {
    return "ended";
  }

  return "ended";
}

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

    if ((roleData as { role?: string } | null)?.role !== "vendor") {
      return NextResponse.json(
        { error: "Vendor access required" },
        { status: 403 }
      );
    }

    const ip = getClientIp(request);
    const allowed = await consumeRateLimit(ip, "vendor_promotions", 60, 1);

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    const { data: vendorData } = await admin
      .from("vendor_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const vendor = (vendorData as { id: string } | null);

    if (!vendor) {
      return NextResponse.json(
        { error: "Vendor profile not found" },
        { status: 404 }
      );
    }

    const { data: adsData, error: adsError } = await admin
      .from("ad_requests")
      .select(
        "id, target_type, status, starts_at, ends_at, price_paid, created_at"
      )
      .eq("vendor_id", vendor.id)
      .order("created_at", { ascending: false });

    if (adsError) {
      console.error("Vendor promotions lookup error:", adsError);
      return NextResponse.json(
        { error: "Failed to load promotions" },
        { status: 500 }
      );
    }

    const ads =
      (adsData as unknown as
        | {
            id: string;
            target_type: string;
            status: string;
            starts_at: string | null;
            ends_at: string | null;
            price_paid: number | null;
          }[]
        | null) || [];

    const data = ads.map((ad) => {
      const status = mapStatus(ad.status, ad.ends_at, ad.starts_at);
      const spent = Number(ad.price_paid || 0);

      return {
        id: ad.id,
        type: ["featured", "sponsored", "banner"].includes(ad.target_type)
          ? ad.target_type
          : "featured",
        status,
        start_date: ad.starts_at || ad.created_at,
        end_date: ad.ends_at,
        /* Impressions/clicks come from platform analytics when an
         * ad placement is live; zero while pending. */
        impressions: 0,
        clicks: 0,
        spent,
        budget: spent,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Vendor promotions API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const PROMO_PRICES: Record<string, number> = {
  featured: 5000,
  sponsored: 10000,
  banner: 25000,
};

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

    const { data: roleData } = await admin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if ((roleData as { role?: string } | null)?.role !== "vendor") {
      return NextResponse.json(
        { error: "Vendor access required" },
        { status: 403 }
      );
    }

    const ip = getClientIp(request);
    const allowed = await consumeRateLimit(
      ip,
      "vendor_promotion_create",
      10,
      60
    );

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      type?: unknown;
      listingId?: unknown;
    };

    const promoType =
      typeof body.type === "string" &&
      ["featured", "sponsored", "banner"].includes(body.type)
        ? body.type
        : null;

    if (!promoType) {
      return NextResponse.json(
        { error: "Promotion type must be featured, sponsored or banner." },
        { status: 400 }
      );
    }

    const { data: vendorData } = await admin
      .from("vendor_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const vendor = (vendorData as { id: string } | null);

    if (!vendor) {
      return NextResponse.json(
        { error: "Vendor profile not found" },
        { status: 404 }
      );
    }

    /* A banner/ad targets listings; a listing may be required for
     * featured/sponsored so at least one verified asset exists. */
    let targetIds: string[] = [];

    if (
      ["featured", "banner"].includes(promoType) ||
      typeof body.listingId === "string"
    ) {
      if (typeof body.listingId !== "string" || !body.listingId.trim()) {
        return NextResponse.json(
          { error: "Select the listing you want to promote." },
          { status: 400 }
        );
      }

      const { data: listingRow } = await admin
        .from("listings")
        .select("id, vendor_id")
        .eq("id", body.listingId.trim())
        .maybeSingle();

      const listing = (listingRow as { id: string; vendor_id: string } | null);

      if (!listing || listing.vendor_id !== vendor.id) {
        return NextResponse.json(
          { error: "That listing was not found in your account." },
          { status: 404 }
        );
      }

      targetIds = [listing.id];
    }

    const now = new Date();
    const durationDays = 7;

    const { data: createdData, error: createError } = await admin
      .from("ad_requests")
      .insert({
        vendor_id: vendor.id,
        target_type: promoType,
        target_ids: targetIds,
        status: "pending",
        duration_days: durationDays,
        price_paid: PROMO_PRICES[promoType],
      } as unknown as never)
      .select("id, status, starts_at, ends_at, price_paid")
      .single();

    if (createError) {
      console.error("Promotion request creation failed:", createError);
      return NextResponse.json(
        { error: "Failed to submit your promotion request." },
        { status: 500 }
      );
    }

    const created = (createdData as unknown as {
      id: string;
      status: string;
    }) || null;

    return NextResponse.json({
      success: true,
      message:
        "Promotion request submitted. You will be notified once it is reviewed.",
      data: created,
    });
  } catch (error) {
    console.error("Vendor promotion creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
