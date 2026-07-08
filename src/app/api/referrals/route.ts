import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateReferralCode } from "@/lib/utils";
import type { Database } from "@/types/database";

type ReferralRow = Database["public"]["Tables"]["referrals"]["Row"];
type ReferralInsert = Database["public"]["Tables"]["referrals"]["Insert"];

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
    const { action } = body;

    if (action === "generate") {
      return await handleGenerate(user.id, body.referrer_type || "buyer");
    }

    if (action === "claim") {
      return await handleClaim(user.id, body.code);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Referral API error:", error);
    return NextResponse.json(
      { error: "Failed to process referral" },
      { status: 500 }
    );
  }
}

async function handleGenerate(userId: string, referrerType: "buyer" | "vendor") {
  const adminClient = createAdminClient();

  // Check if user already has an active referral code
  const { data: existing } = await adminClient
    .from("referrals")
    .select("code")
    .eq("referrer_id", userId)
    .eq("status", "pending")
    .maybeSingle();

  const existingRow = existing as { code: string } | null;
  if (existingRow) {
    return NextResponse.json({ success: true, code: existingRow.code });
  }

  // Generate a unique code
  let code: string;
  let isUnique = false;

  while (!isUnique) {
    code = generateReferralCode();
    const { data: conflict } = await adminClient
      .from("referrals")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (!conflict) isUnique = true;
  }

  const { data, error } = await adminClient
    .from("referrals")
    .insert({
      referrer_id: userId,
      referrer_type: referrerType,
      code: code!,
      status: "pending",
    } as never)
    .select()
    .single();

  if (error) throw error;

  const result = data as unknown as ReferralRow;
  return NextResponse.json({ success: true, code: result.code });
}

async function handleClaim(userId: string, code: string) {
  const adminClient = createAdminClient();

  // Find the referral
  const { data: referralData } = await adminClient
    .from("referrals")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  const referral = referralData as ReferralRow | null;

  if (!referral) {
    return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });
  }

  if (referral.referrer_id === userId) {
    return NextResponse.json(
      { error: "You cannot use your own referral code" },
      { status: 400 }
    );
  }

  if (referral.status !== "pending") {
    return NextResponse.json(
      { error: "This referral code has already been used" },
      { status: 400 }
    );
  }

  // Get the claiming user's details
  const { data: claimingUserData } = await adminClient
    .from("users")
    .select("email")
    .eq("id", userId)
    .single();

  const claimingUser = claimingUserData as { email: string } | null;

  // Mark as converted
  const { error } = await adminClient
    .from("referrals")
    .update({
      referred_id: userId,
      referred_email: claimingUser?.email || null,
      status: "converted",
    } as never)
    .eq("id", referral.id);

  if (error) throw error;

  return NextResponse.json({
    success: true,
    message: "Referral code applied successfully!",
  });
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

    const url = new URL(request.url);
    const type = url.searchParams.get("type") || "sent"; // "sent" or "received"

    const adminClient = createAdminClient();

    if (type === "sent") {
      const { data, error } = await adminClient
        .from("referrals")
        .select("*")
        .eq("referrer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const rows = (data || []) as ReferralRow[];
      const converted = rows.filter((r) => r.status === "converted" || r.status === "rewarded").length;
      const pending = rows.filter((r) => r.status === "pending").length;

      return NextResponse.json({
        data: rows,
        stats: { total: rows.length, converted, pending },
      });
    }

    // Received referrals (claimed using this user's code)
    const { data, error } = await adminClient
      .from("referrals")
      .select("*")
      .eq("referred_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data: (data || []) as ReferralRow[] });
  } catch (error) {
    console.error("Fetch referrals error:", error);
    return NextResponse.json(
      { error: "Failed to fetch referrals" },
      { status: 500 }
    );
  }
}
