export { cn } from "./cn";

/**
 * Format a price in Naira
 */
export function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Generate a URL-friendly slug from a string
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/**
 * Generate a WhatsApp deep link with pre-filled message
 */
export function whatsappDeepLink(phone: string, message: string): string {
  const cleaned = phone.replace(/[\s+\-()]/g, "");
  const formatted = cleaned.startsWith("0")
    ? `234${cleaned.slice(1)}`
    : cleaned.startsWith("+")
      ? cleaned.slice(1)
      : cleaned;
  return `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`;
}

/**
 * Check if a vendor is currently open based on store hours
 */
export function isOpenNow(storeHours: Record<string, { open: string; close: string }> | null): boolean {
  if (!storeHours) return false;
  const now = new Date();
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const today = days[now.getDay()];
  const hours = storeHours[today];
  if (!hours) return false;

  const [openH, openM] = hours.open.split(":").map(Number);
  const [closeH, closeM] = hours.close.split(":").map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "...";
}

/**
 * Generate a random referral code
 */
export function generateReferralCode(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
