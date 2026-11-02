import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * GET /api/favorites
 *
 * Returns the authenticated buyer's favourite vendors with the
 * vendor display fields the favourites page expects:
 * { id, vendor_id, business_name, slug, category, location,
 *   rating, logo_url, created_at }
 *
 * POST /api/favorites
 * { vendorId } → adds a favourite for the signed-in buyer.
 *
 * DELETE /api/favorites
 * { favoriteId } → removes the buyer's own favourite row.
 *
 * Pairing/or ownership are always derived from the session — the
 * browser can only act on its own favourites.
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
    const allowed = await consumeRateLimit(ip, "favorites_get", 60, 1);

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    const { data: rows, error } = await admin
      .from("favorites")
      .select(
        `
        id,
        created_at,
        vendor_id,
        vendor_profiles (
          id,
          business_name,
          slug,
          category_id,
          city,
          state,
          logo_url,
          categories ( name )
        )
      `
      )
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Favorites lookup error:", error);
      return NextResponse.json(
        { error: "Failed to load favourites" },
        { status: 500 }
      );
    }

    const favoriteRows =
      (rows as unknown as
        | {
            id: string;
            created_at: string;
            vendor_id: string;
            vendor_profiles: {
              id: string;
              business_name: string;
              slug: string;
              category_id: string | null;
              city: string | null;
              state: string | null;
              logo_url: string | null;
              categories: { name: string } | null;
            } | null;
          }[]
        | null) || [];

    /* Aggregate review ratings in one query for all favourite vendors. */
    const vendorIds = favoriteRows
      .map((row) => row.vendor_id)
      .filter(Boolean);

    let ratingByVendor = new Map<string, { rating: number; count: number }>();

    if (vendorIds.length > 0) {
      const { data: ratingRows } = await admin
        .from("reviews")
        .select("vendor_id, rating")
        .in("vendor_id", vendorIds);

      const ratings =
        (ratingRows as unknown as
          | { vendor_id: string; rating: number }[]
          | null) || [];

      const sums = new Map<string, { total: number; count: number }>();

      for (const review of ratings) {
        const bucket = sums.get(review.vendor_id) || {
          total: 0,
          count: 0,
        };

        bucket.total += review.rating || 0;
        bucket.count += 1;
        sums.set(review.vendor_id, bucket);
      }

      ratingByVendor = new Map(
        Array.from(sums.entries()).map(([id, bucket]) => [
          id,
          {
            rating:
              bucket.count > 0
                ? Math.round((bucket.total / bucket.count) * 10) / 10
                : 0,
            count: bucket.count,
          },
        ])
      );
    }

    const data = favoriteRows
      .filter((row) => row.vendor_profiles)
      .map((row) => {
        const vendor = row.vendor_profiles!;
        const ratingInfo = ratingByVendor.get(row.vendor_id);

        const locationBits = [vendor.city, vendor.state].filter(Boolean);

        return {
          id: row.id,
          vendor_id: vendor.id,
          business_name: vendor.business_name,
          slug: vendor.slug,
          category: vendor.categories?.name || "General",
          location:
            locationBits.length > 0
              ? locationBits.join(", ")
              : "Nigeria",
          rating: ratingInfo?.rating ?? 0,
          reviews: ratingInfo?.count ?? 0,
          logo_url: vendor.logo_url,
          created_at: row.created_at,
        };
      });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Favorites API error:", error);
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

    const { data: roleData } = await admin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if ((roleData as { role?: string } | null)?.role !== "buyer") {
      return NextResponse.json(
        { error: "Only buyers can save vendors" },
        { status: 403 }
      );
    }

    const ip = getClientIp(request);
    const allowed = await consumeRateLimit(ip, "favorites_post", 40, 1);

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
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

    /* The vendor must exist — never create favourites for unknown ids. */
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

    /* Deduplicate: the same vendor once per buyer. */
    const { data: existingRow } = await admin
      .from("favorites")
      .select("id")
      .eq("buyer_id", user.id)
      .eq("vendor_id", vendorId)
      .maybeSingle();

    if (existingRow) {
      return NextResponse.json({
        success: true,
        alreadySaved: true,
        favoriteId: (existingRow as { id: string }).id,
      });
    }

    const { data: createdData, error: createError } = await admin
      .from("favorites")
      .insert({
        buyer_id: user.id,
        vendor_id: vendorId,
      })
      .select("id")
      .single();

    if (createError) {
      console.error("Favorite creation failed:", createError);
      return NextResponse.json(
        { error: "Failed to save vendor" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      alreadySaved: false,
      favoriteId: (createdData as unknown as { id: string }).id,
    });
  } catch (error) {
    console.error("Favorite creation error:", error);
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

    const body = (await request.json().catch(() => null)) as {
      favoriteId?: unknown;
    } | null;

    const favoriteId =
      typeof body?.favoriteId === "string" ? body.favoriteId.trim() : "";

    if (!favoriteId) {
      return NextResponse.json(
        { error: "favoriteId is required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    /* Ownership guard: buyer_id = session user. Rows owned by other
     * accounts are simply never matched. */
    const { error: deleteError } = await admin
      .from("favorites")
      .delete()
      .eq("id", favoriteId)
      .eq("buyer_id", user.id);

    if (deleteError) {
      console.error("Favorite deletion failed:", deleteError);
      return NextResponse.json(
        { error: "Failed to remove favourite" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Favorite deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
