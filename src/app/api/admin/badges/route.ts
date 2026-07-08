import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordSocialProof } from "@/lib/social-proof";

// GET /api/admin/badges — Fetch all vendors with their badge status
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // verified | unverified | all

    const adminClient = createAdminClient();

    let query = adminClient
      .from("vendor_profiles")
      .select(`
        id,
        business_name,
        slug,
        email,
        phone,
        city,
        state,
        is_verified,
        verified_badge_granted_at,
        is_vip,
        created_at,
        users!inner(id, email, full_name)
      `)
      .order("created_at", { ascending: false });

    if (status === "verified") {
      query = query.eq("is_verified", true);
    } else if (status === "unverified") {
      query = query.eq("is_verified", false);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Admin badges fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch vendors" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Admin badges fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/badges — Grant or revoke a verified badge
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { vendorId, action, adminUserId } = body;
    // action: "grant" | "revoke"

    if (!vendorId || !action || !adminUserId) {
      return NextResponse.json(
        { error: "vendorId, action, and adminUserId are required" },
        { status: 400 }
      );
    }

    if (!["grant", "revoke"].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'grant' or 'revoke'" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Fetch current state for audit logging
    const { data: oldProfile } = await adminClient
      .from("vendor_profiles")
      .select("is_verified, verified_badge_granted_at")
      .eq("id", vendorId)
      .single();

    if (!oldProfile) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      );
    }

    const profile = oldProfile as unknown as {
      is_verified: boolean;
      verified_badge_granted_at: string | null;
    };

    if (action === "grant") {
      if (profile.is_verified) {
        return NextResponse.json(
          { error: "Vendor already has a verified badge" },
          { status: 409 }
        );
      }

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
        console.error("Badge grant error:", error);
        return NextResponse.json(
          { error: "Failed to grant verified badge" },
          { status: 500 }
        );
      }

      // Audit log
      await adminClient.from("admin_audit_log").insert({
        admin_user_id: adminUserId,
        action: "badge_granted",
        target_id: vendorId,
        old_value: { is_verified: false },
        new_value: { is_verified: true, granted_at: new Date().toISOString() },
      } as never);

      // Record social proof for badge grant
      if (data) {
        const d = data as unknown as { business_name: string; slug: string };
        recordSocialProof({
          activity_type: "badge_earned",
          actor_name: d.business_name || "A vendor",
          actor_role: "vendor",
          target_name: "Verified Badge",
          target_type: "vendor",
          target_url: `/vendors/${d.slug}`,
          metadata: { vendorId, action: "badge_granted" },
        });
      }

      return NextResponse.json({
        success: true,
        message: "Verified badge granted successfully",
        data,
      });
    } else {
      // Revoke badge
      if (!profile.is_verified) {
        return NextResponse.json(
          { error: "Vendor does not have a verified badge" },
          { status: 409 }
        );
      }

      const { data, error } = await adminClient
        .from("vendor_profiles")
        .update({
          is_verified: false,
          verified_badge_granted_at: null,
        } as never)
        .eq("id", vendorId)
        .select()
        .single();

      if (error) {
        console.error("Badge revoke error:", error);
        return NextResponse.json(
          { error: "Failed to revoke verified badge" },
          { status: 500 }
        );
      }

      // Audit log
      await adminClient.from("admin_audit_log").insert({
        admin_user_id: adminUserId,
        action: "badge_revoked",
        target_id: vendorId,
        old_value: { is_verified: true, granted_at: profile.verified_badge_granted_at },
        new_value: { is_verified: false },
      } as never);

      return NextResponse.json({
        success: true,
        message: "Verified badge revoked successfully",
        data,
      });
    }
  } catch (err) {
    console.error("Admin badge action error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
