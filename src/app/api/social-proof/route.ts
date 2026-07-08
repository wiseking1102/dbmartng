import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type SocialActivityRow = Database["public"]["Tables"]["social_activities"]["Row"];
type SocialActivityInsert = Database["public"]["Tables"]["social_activities"]["Insert"];

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { activity_type, actor_name, actor_avatar, target_name, target_type, target_url, metadata } = body;

    if (!activity_type || !actor_name) {
      return NextResponse.json(
        { error: "activity_type and actor_name are required" },
        { status: 400 }
      );
    }

    const validTypes = [
      "purchase", "review", "signup", "listing_added",
      "vendor_joined", "inquiry_sent", "badge_earned",
    ];

    if (!validTypes.includes(activity_type)) {
      return NextResponse.json(
        { error: `Invalid activity_type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("social_activities")
      .insert({
        activity_type,
        actor_name,
        actor_avatar: actor_avatar || null,
        target_name: target_name || null,
        target_type: target_type || null,
        target_url: target_url || null,
        metadata: metadata || {},
      } as never)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: data as unknown as SocialActivityRow });
  } catch (error) {
    console.error("Social proof record error:", error);
    return NextResponse.json(
      { error: "Failed to record activity" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("social_activities")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ data: (data || []) as SocialActivityRow[] });
  } catch (error) {
    console.error("Fetch social activities error:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    );
  }
}
