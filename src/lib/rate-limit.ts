import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Simple DB-backed rate limiting for public/sensitive endpoints.
 *
 * Uses the existing consume_rate_limit() Postgres function when
 * available. If the function (or the database) is unavailable,
 * this FAILS OPEN so a limiter outage cannot take the API down.
 */
export async function consumeRateLimit(
  identifier: string,
  action: string,
  limit: number,
  windowMinutes: number
): Promise<boolean> {
  try {
    const adminClient = createAdminClient() as any;

    const { data, error } = await adminClient.rpc(
      "consume_rate_limit",
      {
        p_identifier: identifier,
        p_action: action,
        p_limit: limit,
        p_window_minutes: windowMinutes,
      }
    );

    if (error) {
      console.warn("[rate-limit] rpc failed, failing open:", error?.message);
      return true;
    }

    // consume_rate_limit returns boolean (or { allowed } in some variants)
    if (typeof data === "boolean") return data;
    if (data && typeof data === "object" && "allowed" in data) {
      return !!data.allowed;
    }

    return true;
  } catch (error) {
    console.warn("[rate-limit] error, failing open:", error);
    return true;
  }
}

/**
 * Best-effort client IP extraction for rate-limit identifiers.
 * Vercel provides x-forwarded-for / x-real-ip.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return request.headers.get("x-real-ip") || "unknown";
}
