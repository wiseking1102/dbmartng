import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/reports?status=open — Fetch vendor complaints
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const adminClient = createAdminClient();

    let query = adminClient
      .from("vendor_complaints")
      .select(`
        *,
        vendor:vendor_profiles!vendor_complaints_vendor_id_fkey(
          id,
          business_name,
          slug,
          city,
          state,
          is_verified,
          complaint_count
        ),
        buyer:users!vendor_complaints_buyer_id_fkey(
          id,
          email,
          full_name,
          avatar_url
        ),
        resolver:users!vendor_complaints_resolved_by_fkey(
          id,
          email,
          full_name
        )
      `)
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Complaints fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch complaints" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Complaints fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/reports — Update complaint status
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { complaintId, action, adminUserId, reason } = body;
    // action: "investigate" | "resolve" | "dismiss"
    // reason: optional reason for dismiss

    if (!complaintId || !action || !adminUserId) {
      return NextResponse.json(
        { error: "complaintId, action, and adminUserId are required" },
        { status: 400 }
      );
    }

    const validActions = ["investigate", "resolve", "dismiss"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `action must be one of: ${validActions.join(", ")}` },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Fetch current complaint for audit logging
    const { data: existing } = await adminClient
      .from("vendor_complaints")
      .select("*")
      .eq("id", complaintId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Complaint not found" },
        { status: 404 }
      );
    }

    const complaint = existing as unknown as {
      id: string;
      vendor_id: string;
      status: string;
    };

    let newStatus: string;
    switch (action) {
      case "investigate":
        newStatus = "investigating";
        break;
      case "resolve":
        newStatus = "resolved";
        break;
      case "dismiss":
        newStatus = "dismissed";
        break;
      default:
        newStatus = complaint.status;
    }

    // Idempotency check
    if (complaint.status === newStatus) {
      return NextResponse.json(
        { error: `Complaint is already ${newStatus}` },
        { status: 409 }
      );
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      open: ["investigating", "dismissed"],
      investigating: ["resolved", "dismissed"],
      resolved: [],
      dismissed: [],
    };

    const allowed = validTransitions[complaint.status] || [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from '${complaint.status}' to '${newStatus}'` },
        { status: 400 }
      );
    }

    const { data, error } = await adminClient
      .from("vendor_complaints")
      .update({
        status: newStatus,
        resolved_by: adminUserId,
      } as never)
      .eq("id", complaintId)
      .select()
      .single();

    if (error) {
      console.error("Complaint update error:", error);
      return NextResponse.json(
        { error: "Failed to update complaint" },
        { status: 500 }
      );
    }

    // If resolved or dismissed, decrement the vendor's complaint_count
    if (newStatus === "resolved" || newStatus === "dismissed") {
      const { data: vendorProfile } = await adminClient
        .from("vendor_profiles")
        .select("complaint_count")
        .eq("id", complaint.vendor_id)
        .single();

      if (vendorProfile) {
        const vp = vendorProfile as unknown as { complaint_count: number };
        const newCount = Math.max(0, vp.complaint_count - 1);
        await adminClient
          .from("vendor_profiles")
          .update({ complaint_count: newCount } as never)
          .eq("id", complaint.vendor_id);
      }
    }

    // Audit log
    await adminClient.from("admin_audit_log").insert({
      admin_user_id: adminUserId,
      action: `complaint_${action}`,
      target_id: complaintId,
      old_value: { status: complaint.status },
      new_value: { status: newStatus, reason: (action === "dismiss" && reason) ? reason : undefined },
    } as never);

    return NextResponse.json({
      success: true,
      message: `Complaint ${action}d successfully`,
      data,
    });
  } catch (err) {
    console.error("Complaint action error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
