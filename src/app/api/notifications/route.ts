import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/notifications?userId=xxx&limit=50 — Fetch user notifications
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Verify the requesting user is the same as the requested user
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    let query = adminClient
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.is("read_at", null);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Notifications fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch notifications" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Notifications fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/notifications — Create a notification (for system-generated events)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, type, title, body: notificationBody, payload } = body;

    if (!userId || !type || !title) {
      return NextResponse.json(
        { error: "userId, type, and title are required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from("notifications")
      .insert({
        user_id: userId,
        type,
        title,
        body: notificationBody || null,
        payload: payload || null,
      } as never)
      .select()
      .single();

    if (error) {
      console.error("Notification create error:", error);
      return NextResponse.json(
        { error: "Failed to create notification" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Notification create error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/notifications — Mark notifications as read
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { userId, notificationId, markAll } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Verify authorization
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    const updateData = {
      read_at: new Date().toISOString(),
    };

    let query = adminClient
      .from("notifications")
      .update(updateData as never);

    if (markAll) {
      query = query.eq("user_id", userId).is("read_at", null);
    } else if (notificationId) {
      query = query.eq("id", notificationId).eq("user_id", userId);
    } else {
      return NextResponse.json(
        { error: "notificationId or markAll is required" },
        { status: 400 }
      );
    }

    const { error: updateError } = await query;

    if (updateError) {
      console.error("Notification update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update notifications" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Notification update error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
