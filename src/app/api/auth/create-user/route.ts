import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordSocialProof } from "@/lib/social-proof";
import { processReferralReward } from "@/lib/referral-rewards";

export async function POST(request: Request) {
  try {
    const { userId, email, phone, role, fullName, referralCode } = await request.json();

    if (!userId || !role) {
      return NextResponse.json(
        { error: "userId and role are required" },
        { status: 400 }
      );
    }

    if (!["buyer", "vendor"].includes(role)) {
      return NextResponse.json(
        { error: "Role must be 'buyer' or 'vendor'" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Create user profile with service role (bypasses RLS)
    const { error: insertError } = await adminClient.from("users").insert({
      id: userId,
      email: email || null,
      phone: phone || null,
      role,
      full_name: fullName || null,
    } as never);

    if (insertError) {
      // If user already exists, that's okay - they're just logging in again
      if (insertError.code === "23505") {
        return NextResponse.json({
          success: true,
          message: "User already exists",
        });
      }
      console.error("User creation error:", insertError);
      return NextResponse.json(
        { error: "Failed to create user profile" },
        { status: 500 }
      );
    }

    // ── Process referral reward if a code was provided ──
    const displayName = fullName || email || "A new user";

    if (referralCode) {
      processReferralReward({
        referralCode,
        newUserId: userId,
        newUserName: displayName,
      });
    }

    // Record social proof for new signups
    recordSocialProof({
      activity_type: "signup",
      actor_name: displayName,
      actor_role: role === "vendor" ? "vendor" : "buyer",
      metadata: { userId },
    });

    return NextResponse.json({
      success: true,
      message: "User profile created",
    });
  } catch (err) {
    console.error("Create user error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
