import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBearerUser } from "@/lib/auth/server-auth";
import { consumeRateLimit } from "@/lib/rate-limit";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_BODY_LENGTH = 5000;

/**
 * POST /api/messages
 *
 * Two supported modes:
 *
 * 1. Buyer → vendor inquiry:
 *    { vendorId, body, subject? }  (authenticated buyer)
 *
 * 2. Conversation reply:
 *    { conversationUserId, body }  (buyer or vendor participant)
 *
 * The sender is ALWAYS derived from the bearer token — the browser
 * can never spoof sender identity.
 */
export async function POST(request: Request) {
  try {
    const user = await getBearerUser(request);

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    let body: Record<string, unknown> = {};

    try {
      const parsed = await request.json();
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        body = parsed as Record<string, unknown>;
      }
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const content =
      typeof body.body === "string"
        ? body.body.trim()
        : typeof body.message === "string"
          ? body.message.trim()
          : "";

    if (!content) {
      return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
    }

    if (content.length > MAX_BODY_LENGTH) {
      return NextResponse.json(
        { error: `Message is too long (max ${MAX_BODY_LENGTH} characters).` },
        { status: 400 }
      );
    }

    // Rate limit: 30 messages per 10 minutes per user
    const allowed = await consumeRateLimit(user.id, "messages", 30, 10);

    if (!allowed) {
      return NextResponse.json(
        { error: "You are sending messages too quickly. Please slow down." },
        { status: 429 }
      );
    }

    const adminClient = createAdminClient() as any;

    const subject =
      typeof body.subject === "string"
        ? body.subject.trim().slice(0, 200) || null
        : null;

    // ── Mode 1: buyer → vendor inquiry ──────────────────────
    if (typeof body.vendorId === "string" && body.vendorId.trim()) {
      const vendorId = body.vendorId.trim();

      if (!UUID_RE.test(vendorId)) {
        return NextResponse.json({ error: "Invalid vendor." }, { status: 400 });
      }

      const { data: vendorData, error: vendorError } = await adminClient
        .from("vendor_profiles")
        .select("id, user_id, business_name, slug")
        .eq("id", vendorId)
        .maybeSingle();

      if (vendorError || !vendorData) {
        return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
      }

      const vendor = vendorData as {
        id: string;
        user_id: string;
        business_name: string;
        slug: string;
      };

      if (vendor.user_id === user.id) {
        return NextResponse.json(
          { error: "You cannot message your own vendor account." },
          { status: 400 }
        );
      }

      const { error: insertError } = await adminClient.from("messages").insert({
        sender_id: user.id,
        receiver_id: vendor.user_id,
        vendor_id: vendor.id,
        subject,
        body: content,
        is_read: false,
      } as never);

      if (insertError) {
        console.error("[messages] insert error:", insertError);
        return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
      }

      // Best-effort notification
      try {
        await adminClient.from("notifications").insert({
          user_id: vendor.user_id,
          type: "new_message",
          title: "New message",
          body: `You have a new inquiry about ${vendor.business_name}.`,
        } as never);
      } catch {
        // non-fatal
      }

      return NextResponse.json({ success: true, message: "Message sent successfully" });
    }

    // ── Mode 2: reply within an existing conversation ────────
    if (typeof body.conversationUserId === "string" && body.conversationUserId.trim()) {
      const otherUserId = body.conversationUserId.trim();

      if (!UUID_RE.test(otherUserId)) {
        return NextResponse.json({ error: "Invalid conversation." }, { status: 400 });
      }

      if (otherUserId === user.id) {
        return NextResponse.json({ error: "You cannot message yourself." }, { status: 400 });
      }

      // Both participants must have prior history — prevents arbitrary
      // message blasting to random user IDs.
      const { data: historyData } = await adminClient
        .from("messages")
        .select("id")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
        )
        .limit(1);

      const history = (historyData as unknown as { id: string }[] | null) || [];

      if (history.length === 0) {
        return NextResponse.json(
          { error: "No conversation exists with this user." },
          { status: 403 }
        );
      }

      const { error: insertError } = await adminClient.from("messages").insert({
        sender_id: user.id,
        receiver_id: otherUserId,
        subject: null,
        body: content,
        is_read: false,
      } as never);

      if (insertError) {
        console.error("[messages] reply insert error:", insertError);
        return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
      }

      try {
        await adminClient.from("notifications").insert({
          user_id: otherUserId,
          type: "new_message",
          title: "New message",
          body: "You have a new message.",
        } as never);
      } catch {
        // non-fatal
      }

      return NextResponse.json({ success: true, message: "Message sent successfully" });
    }

    return NextResponse.json(
      { error: "vendorId or conversationUserId is required" },
      { status: 400 }
    );
  } catch (err) {
    console.error("[messages] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/messages?conversationUserId=<uuid>
 *
 * Returns messages between the authenticated user and the other
 * participant. Only the two participants can ever read a thread.
 */
export async function GET(request: Request) {
  try {
    const user = await getBearerUser(request);

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const url = new URL(request.url);
    const otherUserId = url.searchParams.get("conversationUserId") || "";

    if (!UUID_RE.test(otherUserId)) {
      return NextResponse.json({ error: "conversationUserId is required" }, { status: 400 });
    }

    const adminClient = createAdminClient() as any;

    const { data, error } = await adminClient
      .from("messages")
      .select("id, sender_id, receiver_id, body, is_read, created_at")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
      )
      .order("created_at", { ascending: true })
      .limit(500);

    if (error) {
      console.error("[messages] fetch error:", error);
      return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
    }

    const rows = (data as unknown as Record<string, unknown>[] | null) || [];

    const messages = rows.map((row) => ({
      id: row.id as string,
      sender_id: row.sender_id as string,
      content: row.body as string,
      created_at: row.created_at as string,
      is_mine: row.sender_id === user.id,
    }));

    return NextResponse.json({ success: true, data: messages });
  } catch (err) {
    console.error("[messages] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
