import { createAdminClient } from "./supabase/admin";

export type SocialActivityType =
  | "purchase"
  | "review"
  | "signup"
  | "listing_added"
  | "vendor_joined"
  | "inquiry_sent"
  | "badge_earned";

export interface RecordSocialProofParams {
  activity_type: SocialActivityType;
  actor_name: string;
  actor_avatar?: string | null;
  actor_role?: "buyer" | "vendor" | null;
  target_name?: string | null;
  target_type?: "vendor" | "listing" | "review" | null;
  target_url?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Record a social proof activity.
 * This is a fire-and-forget helper — it never throws, logs errors silently.
 */
export async function recordSocialProof(params: RecordSocialProofParams): Promise<void> {
  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient.from("social_activities").insert({
      activity_type: params.activity_type,
      actor_name: params.actor_name,
      actor_avatar: params.actor_avatar || null,
      actor_role: params.actor_role || null,
      target_name: params.target_name || null,
      target_type: params.target_type || null,
      target_url: params.target_url || null,
      metadata: params.metadata || {},
    } as never);

    if (error) {
      console.error("[SocialProof] Failed to record activity:", error.message);
    }
  } catch (err) {
    // Fire-and-forget — never let social proof recording break the main action
    console.error("[SocialProof] Unexpected error:", err);
  }
}
