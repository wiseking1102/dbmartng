import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { error: "Referral code is required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Look up the referral by code
    const { data: referralData, error: referralError } = await adminClient
      .from("referrals")
      .select("*")
      .eq("code", code.toUpperCase())
      .maybeSingle();

    const referral = referralData as unknown as {
      id: string;
      referrer_id: string;
      referrer_type: "buyer" | "vendor";
      status: string;
    } | null;

    if (referralError) throw referralError;
    if (!referral) {
      return NextResponse.json(
        { error: "Invalid referral code" },
        { status: 404 }
      );
    }

    // Get referrer info
    const { data: referrerData } = await adminClient
      .from("users")
      .select("full_name, email, role")
      .eq("id", referral.referrer_id)
      .single();

    const referrer = referrerData as unknown as {
      full_name: string | null;
      email: string | null;
      role: string;
    } | null;

    if (!referrer) {
      return NextResponse.json(
        { error: "Referrer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      referrer: {
        name: referrer.full_name || referrer.email || "A friend",
        type: referral.referrer_type,
      },
    });
  } catch (err) {
    console.error("Referrer info error:", err);
    return NextResponse.json(
      { error: "Failed to fetch referrer info" },
      { status: 500 }
    );
  }
}
