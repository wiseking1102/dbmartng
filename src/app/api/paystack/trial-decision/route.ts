import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { userId, decision } = await request.json();

    if (!userId || !decision || !["pro", "free"].includes(decision)) {
      return NextResponse.json(
        { error: "userId and decision (pro|free) are required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    const updateData: Record<string, any> = {
      trial_decision_made: true,
      trial_decision: decision,
    };

    if (decision === "free") {
      updateData.subscription_status = "free";
    }
    // If "pro", subscription_status stays "trial" until Paystack payment completes

    const { error } = await adminClient
      .from("vendor_profiles")
      .update(updateData as never)
      .eq("user_id", userId);

    if (error) {
      console.error("Trial decision error:", error);
      return NextResponse.json(
        { error: "Failed to save decision" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      decision,
      subscription_status: decision === "free" ? "free" : "trial",
    });
  } catch (err) {
    console.error("Trial decision error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
