import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBearerUser } from "@/lib/auth/server-auth";

/**
 * GET /api/messages/conversations
 *
 * Buyer-side inbox: vendors/businesses the buyer has exchanged
 * messages with. Only the participant can ever call this.
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

    const { data, error } = await adminClient
      .from("messages")
      .select(
        "id, sender_id, receiver_id, vendor_id, body, is_read, created_at"
      )
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      console.error("[conversations] fetch error:", error);
      return NextResponse.json(
        { error: "Failed to load conversations" },
        { status: 500 }
      );
    }

    const rows =
      (data as unknown as Record<string, unknown>[] | null) || [];

    interface Conversation {
      id: string;
      vendor_id: string | null;
      vendor_name: string;
      vendor_slug: string;
      vendor_logo: string | null;
      last_message: string;
      last_message_at: string;
      unread_count: number;
    }

    const byOtherUser = new Map<string, Conversation>();

    for (const row of rows) {
      const otherId =
        row.sender_id === user.id
          ? (row.receiver_id as string)
          : (row.sender_id as string);

      if (!otherId || byOtherUser.has(otherId)) continue;

      byOtherUser.set(otherId, {
        id: otherId,
        vendor_id: (row.vendor_id as string) || null,
        vendor_name: "User",
        vendor_slug: "",
        vendor_logo: null,
        last_message: String(row.body || "").slice(0, 120),
        last_message_at: String(row.created_at || ""),
        unread_count: 0,
      });
    }

    // Count unread per conversation (messages TO me, unread)
    for (const row of rows) {
      if (row.receiver_id === user.id && row.is_read === false) {
        const convo = byOtherUser.get(row.sender_id as string);
        if (convo) convo.unread_count += 1;
      }
    }

    const conversations = Array.from(byOtherUser.values());

    // Enrich vendor info for display
    const vendorIds = [
      ...new Set(
        conversations
          .map((c) => c.vendor_id)
          .filter((id): id is string => !!id)
      ),
    ];

    if (vendorIds.length > 0) {
      const { data: vendorsData } = await adminClient
        .from("vendor_profiles")
        .select("id, business_name, slug, logo_url, user_id")
        .in("id", vendorIds);

      const vendors =
        (vendorsData as unknown as
          | {
              id: string;
              business_name: string;
              slug: string;
              logo_url: string | null;
              user_id: string;
            }[]
          | null) || [];

      const vendorByUserId = new Map(vendors.map((v) => [v.user_id, v]));

      for (const convo of conversations) {
        const vendor = vendorByUserId.get(convo.id);

        if (vendor) {
          convo.vendor_name = vendor.business_name;
          convo.vendor_slug = vendor.slug;
          convo.vendor_logo = vendor.logo_url;
        }
      }
    }

    return NextResponse.json({ success: true, data: conversations });
  } catch (err) {
    console.error("[conversations] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
