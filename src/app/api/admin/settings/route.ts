import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/admin/settings — Fetch all platform settings
export async function GET() {
  try {
    // Verify admin role
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: requester } = await (adminClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single() as never) as unknown as { data: { role: string } | null };

    if (requester?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await adminClient
      .from("platform_settings")
      .select("*")
      .order("key");

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch settings" },
        { status: 500 }
      );
    }

    // Convert to a map for easy consumption by the UI
    const settings: Record<string, unknown> = {};
    const settingsMeta: Record<string, { updated_at: string; updated_by: string | null }> = {};
    (data || []).forEach((s: Record<string, unknown>) => {
      const key = s.key as string;
      settings[key] = s.value;
      settingsMeta[key] = {
        updated_at: s.updated_at as string,
        updated_by: (s.updated_by as string) || null,
      };
    });

    return NextResponse.json({ success: true, settings, meta: settingsMeta });
  } catch (err) {
    console.error("Settings fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/settings — Update a setting
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { key, value, adminUserId } = body;

    if (!key || value === undefined || !adminUserId) {
      return NextResponse.json(
        { error: "key, value, and adminUserId are required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Verify requester is a superior admin
    const { data: requester } = await (adminClient
      .from("users")
      .select("role")
      .eq("id", adminUserId)
      .single() as never) as unknown as { data: { role: string } | null };

    if (requester?.role !== "admin") {
      return NextResponse.json(
        { error: "Only superior admins can change platform settings" },
        { status: 403 }
      );
    }

    // Get current value for audit
    const { data: current } = await (adminClient
      .from("platform_settings")
      .select("value")
      .eq("key", key)
      .single() as never) as unknown as { data: { value: unknown } | null };

    const { error } = await adminClient
      .from("platform_settings")
      .update({
        value,
        updated_at: new Date().toISOString(),
        updated_by: adminUserId,
      } as never)
      .eq("key", key);

    if (error) {
      return NextResponse.json(
        { error: "Failed to update setting" },
        { status: 500 }
      );
    }

    // Audit log
    await adminClient.from("admin_audit_log").insert({
      admin_user_id: adminUserId,
      action: "platform_settings_updated",
      target_id: key,
      old_value: current?.value || null,
      new_value: value,
    } as never);

    return NextResponse.json({
      success: true,
      message: `Setting "${key}" updated successfully`,
    });
  } catch (err) {
    console.error("Settings update error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
