import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── AD REQUESTS ─────────────────────────────────────────────

// GET /api/admin/ads?tab=requests&status=pending — Fetch ad requests
// GET /api/admin/ads?tab=company — Fetch company ads
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") || "requests";
    const status = searchParams.get("status");

    const adminClient = createAdminClient();

    if (tab === "company") {
      const { data, error } = await adminClient
        .from("company_ads")
        .select(`
          *,
          creator:users!company_ads_created_by_fkey(id, email, full_name)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Company ads fetch error:", error);
        return NextResponse.json(
          { error: "Failed to fetch company ads" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, data });
    }

    // Default: fetch ad requests
    let query = adminClient
      .from("ad_requests")
      .select(`
        *,
        vendor_profiles!inner(id, business_name, slug, city, state, is_verified)
      `)
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Ad requests fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch ad requests" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Admin ads fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/ads — Approve or reject an ad request
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { adRequestId, action, adminUserId, reason } = body;
    // action: "approve" | "reject"
    // reason: optional rejection reason

    if (!adRequestId || !action || !adminUserId) {
      return NextResponse.json(
        { error: "adRequestId, action, and adminUserId are required" },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Fetch the current ad request
    const { data: existing } = await adminClient
      .from("ad_requests")
      .select("*")
      .eq("id", adRequestId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Ad request not found" },
        { status: 404 }
      );
    }

    const adReq = existing as unknown as {
      id: string;
      vendor_id: string;
      target_type: string;
      target_ids: string[];
      duration_days: number;
      status: string;
    };

    if (action === "approve") {
      const startsAt = new Date();
      const endsAt = new Date(startsAt.getTime() + adReq.duration_days * 24 * 60 * 60 * 1000);

      const { data, error } = await adminClient
        .from("ad_requests")
        .update({
          status: "approved",
          approved_by: adminUserId,
          approved_at: startsAt.toISOString(),
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
        } as never)
        .eq("id", adRequestId)
        .select()
        .single();

      if (error) {
        console.error("Ad approve error:", error);
        return NextResponse.json(
          { error: "Failed to approve ad request" },
          { status: 500 }
        );
      }

      // If promoting an account, mark vendor as sponsored
      if (adReq.target_type === "account") {
        await adminClient
          .from("vendor_profiles")
          .update({
            is_sponsored: true,
            sponsored_until: endsAt.toISOString(),
          } as never)
          .eq("id", adReq.vendor_id);
      }

      // If promoting specific listings, mark them as promoted
      if (adReq.target_type === "listing" && adReq.target_ids.length > 0) {
        await adminClient
          .from("listings")
          .update({
            is_promoted: true,
            promoted_until: endsAt.toISOString(),
          } as never)
          .in("id", adReq.target_ids);
      }

      // Audit log
      await adminClient.from("admin_audit_log").insert({
        admin_user_id: adminUserId,
        action: "ad_request_approved",
        target_id: adRequestId,
        old_value: { status: adReq.status },
        new_value: { status: "approved", starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString() },
      } as never);

      return NextResponse.json({
        success: true,
        message: "Ad request approved",
        data,
      });
    }

    if (action === "reject") {
      const { data, error } = await adminClient
        .from("ad_requests")
        .update({
          status: "rejected",
          approved_by: adminUserId,
        } as never)
        .eq("id", adRequestId)
        .select()
        .single();

      if (error) {
        console.error("Ad reject error:", error);
        return NextResponse.json(
          { error: "Failed to reject ad request" },
          { status: 500 }
        );
      }

      // Audit log
      await adminClient.from("admin_audit_log").insert({
        admin_user_id: adminUserId,
        action: "ad_request_rejected",
        target_id: adRequestId,
        old_value: { status: adReq.status },
        new_value: { status: "rejected", reason: reason || null },
      } as never);

      return NextResponse.json({
        success: true,
        message: "Ad request rejected",
        data,
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (err) {
    console.error("Admin ad action error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── COMPANY ADS CRUD ────────────────────────────────────────

// POST /api/admin/ads?tab=company — Create a company ad
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab");

    if (tab !== "company") {
      return NextResponse.json(
        { error: "Use POST with ?tab=company to create company ads" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, bannerUrl, destinationUrl, createdBy, startsAt, endsAt, isActive } = body;

    if (!title || !destinationUrl || !createdBy) {
      return NextResponse.json(
        { error: "title, destinationUrl, and createdBy are required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from("company_ads")
      .insert({
        title,
        banner_url: bannerUrl || null,
        destination_url: destinationUrl,
        created_by: createdBy,
        starts_at: startsAt || new Date().toISOString(),
        ends_at: endsAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: isActive !== undefined ? isActive : true,
      } as never)
      .select()
      .single();

    if (error) {
      console.error("Company ad create error:", error);
      return NextResponse.json(
        { error: "Failed to create company ad" },
        { status: 500 }
      );
    }

    // Audit log
    await adminClient.from("admin_audit_log").insert({
      admin_user_id: createdBy,
      action: "company_ad_created",
      target_id: (data as unknown as { id: string }).id,
      new_value: { title, destination_url: destinationUrl },
    } as never);

    return NextResponse.json({
      success: true,
      message: "Company ad created",
      data,
    });
  } catch (err) {
    console.error("Company ad create error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/ads?tab=company — Update a company ad
export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab");

    if (tab !== "company") {
      return NextResponse.json(
        { error: "Use PUT with ?tab=company to update company ads" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { adId, title, bannerUrl, destinationUrl, startsAt, endsAt, isActive, adminUserId } = body;

    if (!adId || !adminUserId) {
      return NextResponse.json(
        { error: "adId and adminUserId are required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Fetch current for audit
    const { data: existing } = await adminClient
      .from("company_ads")
      .select("*")
      .eq("id", adId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Company ad not found" },
        { status: 404 }
      );
    }

    const oldAd = existing as unknown as Record<string, unknown>;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (bannerUrl !== undefined) updateData.banner_url = bannerUrl;
    if (destinationUrl !== undefined) updateData.destination_url = destinationUrl;
    if (startsAt !== undefined) updateData.starts_at = startsAt;
    if (endsAt !== undefined) updateData.ends_at = endsAt;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data, error } = await adminClient
      .from("company_ads")
      .update(updateData as never)
      .eq("id", adId)
      .select()
      .single();

    if (error) {
      console.error("Company ad update error:", error);
      return NextResponse.json(
        { error: "Failed to update company ad" },
        { status: 500 }
      );
    }

    // Audit log
    await adminClient.from("admin_audit_log").insert({
      admin_user_id: adminUserId,
      action: "company_ad_updated",
      target_id: adId,
      old_value: { title: oldAd.title, is_active: oldAd.is_active },
      new_value: updateData,
    } as never);

    return NextResponse.json({
      success: true,
      message: "Company ad updated",
      data,
    });
  } catch (err) {
    console.error("Company ad update error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/ads?tab=company — Delete a company ad
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab");
    const adId = searchParams.get("adId");

    if (tab !== "company") {
      return NextResponse.json(
        { error: "Use DELETE with ?tab=company to delete company ads" },
        { status: 400 }
      );
    }

    if (!adId) {
      return NextResponse.json(
        { error: "adId query parameter is required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("company_ads")
      .delete()
      .eq("id", adId);

    if (error) {
      console.error("Company ad delete error:", error);
      return NextResponse.json(
        { error: "Failed to delete company ad" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Company ad deleted",
    });
  } catch (err) {
    console.error("Company ad delete error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
