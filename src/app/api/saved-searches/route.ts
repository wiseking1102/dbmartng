import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type SavedSearchRow = Database["public"]["Tables"]["saved_searches"]["Row"];
type SavedSearchInsert = Database["public"]["Tables"]["saved_searches"]["Insert"];

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
    const { action, searchId, query, filters, notify_on_match } = body;

    const adminClient = createAdminClient();

    if (action === "save") {
      if (!query) {
        return NextResponse.json({ error: "Search query is required" }, { status: 400 });
      }

      const { data, error } = await adminClient
        .from("saved_searches")
        .insert({
          buyer_id: user.id,
          query,
          filters: filters || {},
          notify_on_match: notify_on_match ?? true,
        } as never)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data: data as unknown as SavedSearchRow });
    }

    if (action === "toggle_notify") {
      if (!searchId) {
        return NextResponse.json({ error: "searchId is required" }, { status: 400 });
      }

      // Verify ownership
      const { data: existing } = await adminClient
        .from("saved_searches")
        .select("notify_on_match")
        .eq("id", searchId)
        .eq("buyer_id", user.id)
        .single();

      const existingRow = existing as { notify_on_match: boolean } | null;
      if (!existingRow) {
        return NextResponse.json({ error: "Saved search not found" }, { status: 404 });
      }

      const { data, error } = await adminClient
        .from("saved_searches")
        .update({
          notify_on_match: !existingRow.notify_on_match,
        } as never)
        .eq("id", searchId)
        .eq("buyer_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data: data as unknown as SavedSearchRow });
    }

    if (action === "delete") {
      if (!searchId) {
        return NextResponse.json({ error: "searchId is required" }, { status: 400 });
      }

      const { error } = await adminClient
        .from("saved_searches")
        .delete()
        .eq("id", searchId)
        .eq("buyer_id", user.id);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Saved searches API error:", error);
    return NextResponse.json(
      { error: "Failed to process saved search" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("saved_searches")
      .select("*")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data: (data || []) as SavedSearchRow[] });
  } catch (error) {
    console.error("Fetch saved searches error:", error);
    return NextResponse.json(
      { error: "Failed to fetch saved searches" },
      { status: 500 }
    );
  }
}
