/**
 * DB-backed Paystack credentials for DBMartNG.
 *
 * Paystack keys (public, secret, webhook secret) are stored in the
 * `platform_settings` table under the key `paystack_keys` as a JSON value.
 * Admins manage them from the admin panel so no redeploy is needed for key rotation.
 *
 * Falls back to env vars if the DB row doesn't exist (for backward compatibility
 * during the transition).
 */

import { createAdminClient } from "@/lib/supabase/admin";

export interface PaystackCredentials {
  public_key: string;
  secret_key: string;
  webhook_secret: string;
}

/**
 * Fetch the active Paystack credentials from the database.
 *
 * Reads the `paystack_keys` row from `platform_settings`.
 * Returns null if the row is missing or the database is unreachable.
 */
export async function getPaystackKeys(): Promise<PaystackCredentials | null> {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("platform_settings")
      .select("value")
      .eq("key", "paystack_keys")
      .single();

    if (error || !data?.value) {
      if (error && error.code !== "PGRST116") {
        // PGRST116 = row not found, which is expected on first load
        console.warn("[Paystack Keys] DB fetch error:", error);
      }
      return null;
    }

    const value =
      typeof data.value === "string"
        ? JSON.parse(data.value)
        : data.value;

    // Validate shape
    if (
      typeof value.public_key !== "string" ||
      typeof value.secret_key !== "string"
    ) {
      console.warn("[Paystack Keys] Invalid shape in platform_settings");
      return null;
    }

    return {
      public_key: value.public_key,
      secret_key: value.secret_key,
      webhook_secret: value.webhook_secret || "",
    };
  } catch (err) {
    console.error("[Paystack Keys] Error:", err);
    return null;
  }
}

/**
 * Get the Paystack secret key, falling back to PAYSTACK_SECRET_KEY env var.
 */
export async function getSecretKey(): Promise<string> {
  const keys = await getPaystackKeys();
  return keys?.secret_key || process.env.PAYSTACK_SECRET_KEY || "";
}

/**
 * Get the Paystack public key, falling back to NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY env var.
 */
export async function getPublicKey(): Promise<string> {
  const keys = await getPaystackKeys();
  return keys?.public_key || process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "";
}

/**
 * Get the Paystack webhook secret, falling back to PAYSTACK_WEBHOOK_SECRET env var.
 */
export async function getWebhookSecret(): Promise<string> {
  const keys = await getPaystackKeys();
  return keys?.webhook_secret || process.env.PAYSTACK_WEBHOOK_SECRET || "";
}
