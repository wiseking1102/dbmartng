import { createAdminClient } from "./supabase/admin";

/**
 * Process a referral reward when a new user signs up with a referral code.
 * - Marks the referral as "rewarded"
 * - Creates in-app notifications for both the referrer and the referred user
 * This is fire-and-forget — it never throws and logs errors silently.
 */
export async function processReferralReward(params: {
  referralCode: string;
  newUserId: string;
  newUserName: string;
}): Promise<void> {
  const { referralCode, newUserId, newUserName } = params;

  if (!referralCode) return;

  try {
    const adminClient = createAdminClient();

    // Find the pending referral by code
    const { data: referralData } = await adminClient
      .from("referrals")
      .select("*")
      .eq("code", referralCode.toUpperCase())
      .maybeSingle();

    const referral = referralData as {
      id: string;
      referrer_id: string;
      referrer_type: "buyer" | "vendor";
      status: string;
      reward_granted: boolean;
    } | null;

    if (!referral) return; // Invalid code — nothing to do
    if (referral.referrer_id === newUserId) return; // Cannot refer yourself
    if (referral.status !== "pending") return; // Already used

    // Get referrer details for the notification
    const { data: referrerData } = await adminClient
      .from("users")
      .select("email, full_name, role")
      .eq("id", referral.referrer_id)
      .single();

    const referrer = referrerData as {
      email: string | null;
      full_name: string | null;
      role: string;
    } | null;

    if (!referrer) return;

    // Mark referral as rewarded (preserve existing referred_email if set)
    await adminClient
      .from("referrals")
      .update({
        referred_id: newUserId,
        referred_name: newUserName,
        status: "rewarded",
        reward_granted: true,
      } as never)
      .eq("id", referral.id);

    // ── Notify the referrer ──
    const rewardDescription =
      referral.referrer_type === "buyer"
        ? "You've earned ₦1,000 in referral credit!"
        : "You've earned 1 month of free Pro access!";

    await adminClient.from("notifications").insert({
      user_id: referral.referrer_id,
      type: "referral_rewarded",
      title: `🎉 Referral Reward Earned!`,
      body: `${newUserName} signed up using your referral link. ${rewardDescription}`,
      payload: {
        referredUserId: newUserId,
        referredName: newUserName,
        rewardType: referral.referrer_type === "buyer" ? "credit" : "pro_month",
      },
    } as never);

    // ── Notify the new user (welcome + who referred them) ──
    const referrerName = referrer.full_name || referrer.email || "A friend";
    await adminClient.from("notifications").insert({
      user_id: newUserId,
      type: "referral_welcome",
      title: `👋 Welcome to DBMartNG!`,
      body: `You were referred by ${referrerName}. Start exploring vendors and services across Nigeria.`,
      payload: {
        referrerId: referral.referrer_id,
        referrerName,
      },
    } as never);
  } catch (err) {
    console.error("[ReferralRewards] Failed to process reward:", err);
  }
}
