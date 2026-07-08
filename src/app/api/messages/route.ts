import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordSocialProof } from "@/lib/social-proof";

// POST /api/messages — Send a message from a buyer to a vendor
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { senderId, senderName, receiverId, vendorId, subject, body: messageBody } = body;

    if (!senderId || !senderName || !receiverId || !vendorId || !messageBody) {
      return NextResponse.json(
        { error: "senderId, senderName, receiverId, vendorId, and body are required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Verify the vendor exists
    const { data: vendorProfile } = await adminClient
      .from("vendor_profiles")
      .select("business_name, slug")
      .eq("id", vendorId)
      .single();

    const vendor = vendorProfile as { business_name: string; slug: string } | null;
    if (!vendor) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      );
    }

    // Create the message
    const { data, error } = await adminClient
      .from("messages")
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        vendor_id: vendorId,
        subject: subject || null,
        body: messageBody,
        is_read: false,
      } as never)
      .select()
      .single();

    if (error) {
      console.error("Message creation error:", error);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    // Record social proof for the inquiry
    recordSocialProof({
      activity_type: "inquiry_sent",
      actor_name: senderName,
      actor_role: "buyer",
      target_name: vendor.business_name,
      target_type: "vendor",
      target_url: `/vendors/${vendor.slug}`,
      metadata: {
        vendorId,
        vendorName: vendor.business_name,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Message sent successfully",
    });
  } catch (err) {
    console.error("Send message error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
