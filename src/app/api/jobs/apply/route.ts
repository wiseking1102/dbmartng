import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { fullName, email, phone, roleInterest, pitch } = await request.json();

    if (!fullName || !email || !roleInterest) {
      return NextResponse.json(
        { error: "fullName, email, and roleInterest are required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    const { data, error } = await adminClient.from("job_applications").insert({
      full_name: fullName,
      email,
      phone: phone || null,
      role_interest: roleInterest,
      pitch: pitch || null,
      status: "pending",
    } as never).select().single();

    if (error) {
      console.error("[jobs/apply] Insert error:", error);
      return NextResponse.json(
        { error: "Failed to submit application" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[jobs/apply] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
