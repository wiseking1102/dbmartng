import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/admin/jobs?status=pending — Fetch job applications
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminClient = createAdminClient();
    const { data: profile } = await (adminClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single() as never) as unknown as { data: { role: string } | null };

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let query = adminClient
      .from("job_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[admin/jobs] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/admin/jobs — Update application status
export async function PATCH(request: Request) {
  try {
    const { applicationId, action, adminUserId } = await request.json();
    if (!applicationId || !action || !adminUserId) {
      return NextResponse.json({ error: "applicationId, action, and adminUserId required" }, { status: 400 });
    }

    const validActions = ["reviewed", "invited", "rejected"];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: `action must be one of: ${validActions.join(", ")}` }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminClient = createAdminClient();
    const { data: profile } = await (adminClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single() as never) as unknown as { data: { role: string } | null };

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await adminClient
      .from("job_applications")
      .update({
        status: action,
        reviewed_by: adminUserId,
      } as never)
      .eq("id", applicationId);

    if (error) {
      return NextResponse.json({ error: "Failed to update application" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/jobs] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
