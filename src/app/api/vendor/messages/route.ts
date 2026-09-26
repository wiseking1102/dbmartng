import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBearerUser } from "@/lib/auth/server-auth";

/**
 * GET /api/vendor/messages
 *
 * Vendor-side inbox: buyers who have messaged this vendor.
 * Shape matches the vendor messages page:
 * { id (buyer user id), buyer_id, buyer_name, buyer_email,
 *   last_message, last_message_at, unread_count, total_messages }
 */
export async function GET(request: Request) {
  try {
    const user = await getBearerUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient() as any;

    // Messages received by this vendor user
    const { data, error } = await adminClient
      .from("messages")
      .select("id, sender_id, body, is_read, created_at")
      .eq("receiver_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      console.error("[vendor-messages] fetch error:", error);
      return NextResponse.json(
        { error: "Failed to load messages" },
        { status: 500 }
      );
    }

    // Messages sent by this vendor user (for totals)
    const { data: sentData } = await adminClient
      .from("messages")
      .select("id, receiver_id")
      .eq("sender_id", user.id)
      .limit(1000);

    const rows =
      (data as unknown as Record<string, unknown>[] | null) || [];
    const sentRows =
      (sentData as unknown as Record<string, unknown>[] | null) || [];

    const sentPerBuyer = new Map<string, number>();
    for (const row of sentRows) {
      const rid = row.receiver_id as string;
      sentPerBuyer.set(rid, (sentPerBuyer.get(rid) || 0) + 1);
    }

    const buyerIds = [
      ...new Set(rows.map((r) => r.sender_id as string)),
    ];

    if (buyerIds.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const { data: buyersData } = await adminClient
      .from("users")
      .select("id, full_name, email")
      .in("id", buyerIds);

    const buyers =
      (buyersData as unknown as
        | { id: string; full_name: string | null; email: string | null }[]
        | null) || [];

    const buyerMap = new Map(buyers.map((b) => [b.id, b]));

    const threads = buyerIds.map((buyerId) => {
      const buyerMsgs = rows.filter((r) => r.sender_id === buyerId);
      const buyer = buyerMap.get(buyerId);

      return {
        id: buyerId,
        buyer_id: buyerId,
        buyer_name: buyer?.full_name || "Buyer",
        buyer_email: buyer?.email || "",
        last_message: String(buyerMsgs[0]?.body || "").slice(0, 120),
        last_message_at: String(buyerMsgs[0]?.created_at || ""),
        unread_count: buyerMsgs.filter((r) => r.is_read === false).length,
        total_messages: buyerMsgs.length + (sentPerBuyer.get(buyerId) || 0),
      };
    });

    return NextResponse.json({ success: true, data: threads });
  } catch (err) {
    console.error("[vendor-messages] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
