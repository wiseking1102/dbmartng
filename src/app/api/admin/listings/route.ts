import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { matchListingAgainstSavedSearches } from "@/lib/search-matcher";

// GET /api/admin/listings — Fetch all listings, optionally filtered by status
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // pending_review | approved | rejected | flagged | all

    const adminClient = createAdminClient();

    let query = adminClient
      .from("listings")
      .select(`
        *,
        vendor_profiles!inner(
          id,
          business_name,
          slug,
          is_verified,
          user_id
        )
      `)
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    } else {
      query = query.in("status", ["pending_review", "flagged", "approved", "rejected"]);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Admin listings fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch listings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Admin listings fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/listings — Approve, reject, or flag a listing
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { listingId, action, adminUserId, reason } = body;
    // action: "approve" | "reject" | "flag" | "clear_flag"
    // reason: optional reason for rejection or flagging

    if (!listingId || !action || !adminUserId) {
      return NextResponse.json(
        { error: "listingId, action, and adminUserId are required" },
        { status: 400 }
      );
    }

    const validActions = ["approve", "reject", "flag", "clear_flag"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `action must be one of: ${validActions.join(", ")}` },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Fetch the current listing state for audit logging
    const { data: oldListing } = await adminClient
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .single();

    if (!oldListing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    const listing = oldListing as unknown as {
      id: string;
      status: string;
      status_reason: string | null;
    };

    const updatePayload: Record<string, unknown> = {
      reviewed_by: adminUserId,
      reviewed_at: new Date().toISOString(),
    };

    switch (action) {
      case "approve":
        updatePayload.status = "approved";
        updatePayload.status_reason = null;
        break;
      case "reject":
        updatePayload.status = "rejected";
        updatePayload.status_reason = reason || "Does not meet platform guidelines";
        break;
      case "flag":
        updatePayload.status = "flagged";
        updatePayload.status_reason = reason || "Flagged for review by admin";
        break;
      case "clear_flag":
        updatePayload.status = "pending_review";
        updatePayload.status_reason = null;
        break;
    }

    const { data, error } = await adminClient
      .from("listings")
      .update(updatePayload as never)
      .eq("id", listingId)
      .select()
      .single();

    if (error) {
      console.error("Admin listing update error:", error);
      return NextResponse.json(
        { error: "Failed to update listing status" },
        { status: 500 }
      );
    }

    // Audit log
    await adminClient.from("admin_audit_log").insert({
      admin_user_id: adminUserId,
      action: `listing_${action}`,
      target_id: listingId,
      old_value: { status: listing.status, status_reason: listing.status_reason },
      new_value: { status: (data as unknown as Record<string, unknown>).status, status_reason: (data as unknown as Record<string, unknown>).status_reason },
    } as never);

    // If listing was approved, fire saved search matching
    if (action === "approve") {
      const listingRow = data as unknown as Record<string, unknown>;
      const vendorId = listingRow.vendor_id as string;
      const listingData = {
        id: listingRow.id as string,
        title: listingRow.title as string,
        description: (listingRow.description as string) || null,
        categoryId: (listingRow.category_id as string) || null,
        tags: (listingRow.tags as string[]) || [],
      };

      // Fetch vendor details for the matched listing
      const { data: vendorData } = await adminClient
        .from("vendor_profiles")
        .select("business_name, slug")
        .eq("id", vendorId)
        .single();

      const vendor = vendorData as { business_name: string; slug: string } | null;

      if (vendor) {
        matchListingAgainstSavedSearches({
          listingId: listingData.id,
          title: listingData.title,
          description: listingData.description,
          categoryId: listingData.categoryId,
          tags: listingData.tags,
          vendorName: vendor.business_name,
          vendorSlug: vendor.slug,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Listing ${action}d successfully`,
      data,
    });
  } catch (err) {
    console.error("Admin listing action error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
