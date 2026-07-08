import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordSocialProof } from "@/lib/social-proof";
import { matchVendorAgainstSavedSearches } from "@/lib/search-matcher";

// GET /api/admin/vendors — Fetch all vendor applications with pending/new status
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // optional filter: all | pending | verified

    const adminClient = createAdminClient();

    let query = adminClient
      .from("vendor_profiles")
      .select(`
        *,
        users!inner(id, email, phone, full_name, avatar_url, created_at),
        categories(name, slug, type)
      `)
      .order("created_at", { ascending: false });

    if (status === "pending") {
      query = query.eq("is_verified", false).eq("subscription_status", "trial");
    } else if (status === "verified") {
      query = query.eq("is_verified", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Admin vendor fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch vendors" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Admin vendor fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/vendors — Approve or reject a vendor application
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { vendorId, action, adminUserId, reason } = body;
    // action: "approve" | "reject"
    // reason: optional rejection reason

    if (!vendorId || !action || !adminUserId) {
      return NextResponse.json(
        { error: "vendorId, action, and adminUserId are required" },
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

    if (action === "approve") {
      // Approve: set is_verified = true
      const { data, error } = await adminClient
        .from("vendor_profiles")
        .update({
          is_verified: true,
          verified_badge_granted_at: new Date().toISOString(),
        } as never)
        .eq("id", vendorId)
        .select()
        .single();

      if (error) {
        console.error("Vendor approval error:", error);
        return NextResponse.json(
          { error: "Failed to approve vendor" },
          { status: 500 }
        );
      }

      // Audit log
      await adminClient.from("admin_audit_log").insert({
        admin_user_id: adminUserId,
        action: "vendor_approved",
        target_id: vendorId,
        new_value: { is_verified: true, verified_badge_granted_at: new Date().toISOString() },
      } as never);

      // Record social proof for approval
      if (data) {
        const v = data as unknown as { business_name: string; slug: string; id: string; description: string | null; category_id: string | null; city: string | null; state: string | null };
        recordSocialProof({
          activity_type: "badge_earned",
          actor_name: v.business_name || "A vendor",
          actor_role: "vendor",
          target_name: "Verified Badge",
          target_type: "vendor",
          target_url: `/vendors/${v.slug}`,
          metadata: { vendorId: v.id, action: "vendor_approved" },
        });

        // Fire saved search matching for the newly approved vendor
        matchVendorAgainstSavedSearches({
          vendorId: v.id,
          businessName: v.business_name || "",
          description: v.description,
          categoryId: v.category_id,
          city: v.city,
          state: v.state,
          slug: v.slug,
        });
      }

      return NextResponse.json({
        success: true,
        message: "Vendor approved successfully",
        data,
      });
    } else {
      // Reject: update subscription_status to "suspended" and record reason
      const { data: oldProfile } = await (adminClient
        .from("vendor_profiles")
        .select("*")
        .eq("id", vendorId)
        .single() as never) as unknown as { data: { is_verified: boolean } | null };

      const { data, error } = await adminClient
        .from("vendor_profiles")
        .update({
          is_verified: false,
        } as never)
        .eq("id", vendorId)
        .select()
        .single();

      if (error) {
        console.error("Vendor rejection error:", error);
        return NextResponse.json(
          { error: "Failed to reject vendor" },
          { status: 500 }
        );
      }

      // Audit log
      await adminClient.from("admin_audit_log").insert({
        admin_user_id: adminUserId,
        action: "vendor_rejected",
        target_id: vendorId,
        old_value: { is_verified: oldProfile?.is_verified ?? false },
        new_value: { is_verified: false, reason: reason || null },
      } as never);

      return NextResponse.json({
        success: true,
        message: "Vendor application rejected",
        data,
      });
    }
  } catch (err) {
    console.error("Admin vendor action error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
