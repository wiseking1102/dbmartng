import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * POST /api/listings/events
 *
 * Records listing engagement events through the trusted database
 * functions instead of letting the browser update counters directly:
 *
 *   { listingId, type: "view" }          → record_listing_view()
 *   { listingId, type: "contact_click" } → record_listing_contact_click()
 *
 * Rate limiting per IP + listing prevents naive view inflation.
 */
const VALID_EVENT_TYPES = ["view", "contact_click"] as const;

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      listingId?: unknown;
      type?: unknown;
    } | null;

    const listingId =
      typeof body?.listingId === "string" ? body.listingId.trim() : "";

    const eventType =
      typeof body?.type === "string" &&
      VALID_EVENT_TYPES.includes(body.type as (typeof VALID_EVENT_TYPES)[number])
        ? (body.type as (typeof VALID_EVENT_TYPES)[number])
        : null;

    if (!listingId || !eventType) {
      return NextResponse.json(
        { error: "listingId and a valid type are required" },
        { status: 400 }
      );
    }

    const ip = getClientIp(request);
    const allowed = await consumeRateLimit(
      `${ip}:${listingId}`,
      `listing_${eventType}`,
      eventType === "view" ? 5 : 10,
      10
    );

    if (!allowed) {
      /* Counted enough times recently — accept silently. */
      return NextResponse.json({ success: true, throttled: true });
    }

    const admin = createAdminClient();

    /* The listing must exist; ownership is irrelevant for view/click
     * events and the increment functions are SECURITY DEFINED. */
    const { data: listingRow } = await admin
      .from("listings")
      .select("id")
      .eq("id", listingId)
      .maybeSingle();

    if (!listingRow) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    const { error: rpcError } = await admin.rpc(
      eventType === "view"
        ? "record_listing_view"
        : "record_listing_contact_click",
      { p_listing_id: listingId }
    );

    if (rpcError) {
      console.error("Listing event RPC failed:", rpcError);
      return NextResponse.json(
        { error: "Could not record event" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Listing events API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
