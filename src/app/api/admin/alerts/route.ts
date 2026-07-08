import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/admin/alerts — Fetch system alerts (admin/sub_admin only)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get("severity");
    const status = searchParams.get("status"); // "open" | "resolved" | "all"
    const limit = parseInt(searchParams.get("limit") || "100");

    // Verify the user is authenticated and has admin/sub_admin role
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await (supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single() as never) as unknown as { data: { role: string } | null };

    if (!profile || (profile.role !== "admin" && profile.role !== "sub_admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminClient = createAdminClient();

    let query = adminClient
      .from("system_alerts")
      .select("*")
      .order("occurred_at", { ascending: false })
      .limit(limit);

    if (severity && severity !== "all") {
      query = query.eq("severity", severity);
    }

    if (status === "open") {
      query = query.is("resolved_at", null);
    } else if (status === "resolved") {
      query = query.not("resolved_at", "is", null);
    }

    const { data, error } = await query;

    if (error) {
      console.error("System alerts fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch system alerts" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("System alerts fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/alerts — Resolve a system alert
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { alertId } = body;

    if (!alertId) {
      return NextResponse.json(
        { error: "alertId is required" },
        { status: 400 }
      );
    }

    // Verify admin auth
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await (supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single() as never) as unknown as { data: { role: string } | null };

    if (!profile || (profile.role !== "admin" && profile.role !== "sub_admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminClient = createAdminClient();

    const { error: updateError } = await adminClient
      .from("system_alerts")
      .update({ resolved_at: new Date().toISOString() } as never)
      .eq("id", alertId);

    if (updateError) {
      console.error("Alert resolve error:", updateError);
      return NextResponse.json(
        { error: "Failed to resolve alert" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Alert resolved",
    });
  } catch (err) {
    console.error("Alert resolve error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
