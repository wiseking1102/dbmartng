import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * POST /api/moderation
 *
 * Text-moderation endpoint used by the listing creation form.
 * Accepts { text } (or { content }) with an optional type and
 * returns { flagged, reason, reasons }.
 *
 * Thin alias of /api/moderation/check with the response shape the
 * listing form actually consumes (single `reason` string), so the
 * client does not request a route that does not exist.
 */
const SPAM_KEYWORDS = [
  "buy followers",
  "cheap likes",
  "click here",
  "act now",
  "limited offer",
  "free money",
  "congratulations you won",
  "earn money fast",
  "work from home earn",
  "$$$",
];

const BLOCKLIST = [
  "fuck",
  "shit",
  "asshole",
  "bastard",
  "scam",
  "fraud",
  "illegal",
  "drugs",
];

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const ip = getClientIp(request);
    const allowed = await consumeRateLimit(ip, "moderation", 40, 1);

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      text?: unknown;
      content?: unknown;
      type?: unknown;
    };

    const raw =
      typeof body.text === "string" && body.text.trim()
        ? body.text
        : typeof body.content === "string" && body.content.trim()
          ? body.content
          : null;

    if (!raw) {
      return NextResponse.json(
        { error: "text or content is required" },
        { status: 400 }
      );
    }

    const type =
      typeof body.type === "string" ? body.type : null;

    const text = raw.toLowerCase().trim();
    const reasons: string[] = [];

    if (text) {
      /* 1. Excessive capitalization (shouting). */
      const letters = raw.replace(/[^a-zA-Z]/g, "").length;
      const uppercase = raw.replace(/[^A-Z]/g, "").length;

      if (letters > 0 && uppercase / letters > 0.7 && raw.length > 20) {
        reasons.push("Excessive capitalization");
      }

      /* 2. Repeated characters. */
      if (/(.)\1{4,}/.test(text)) {
        reasons.push("Repeated characters detected");
      }

      /* 3. Spam keywords. */
      for (const keyword of SPAM_KEYWORDS) {
        if (text.includes(keyword)) {
          reasons.push(`Spam content detected: "${keyword}"`);
          break;
        }
      }

      /* 4. Excessive links. */
      const urlMatches = text.match(/https?:\/\/[^\s]+/g);
      if (urlMatches && urlMatches.length > 2) {
        reasons.push("Excessive URLs");
      }

      /* 5. Phone numbers in name/title fields. */
      if (type === "title" || type === "name") {
        const phonePatterns = [
          /\b\d{11}\b/,
          /\b\d{4}[\s-]?\d{3}[\s-]?\d{4}\b/,
        ];

        if (phonePatterns.some((pattern) => pattern.test(text))) {
          reasons.push("Phone number detected in name/title field");
        }
      }

      /* 6. Profanity blocklist (whole word). */
      for (const word of BLOCKLIST) {
        if (new RegExp(`\\b${word}\\b`, "i").test(text)) {
          reasons.push("Inappropriate content detected");
          break;
        }
      }

      /* 7. HTML/script injection attempts. */
      const htmlPatterns = [
        /<script[\s>]/i,
        /javascript:/i,
        /onerror=/i,
        /onclick=/i,
        /onload=/i,
      ];

      if (htmlPatterns.some((pattern) => pattern.test(text))) {
        reasons.push("Suspicious script content detected");
      }
    }

    return NextResponse.json({
      flagged: reasons.length > 0,
      reason: reasons.length > 0 ? reasons.join("; ") : null,
      reasons,
      score:
        reasons.length > 3
          ? "high"
          : reasons.length > 1
            ? "medium"
            : "low",
    });
  } catch (error) {
    console.error("[moderation] Error:", error);
    return NextResponse.json(
      { error: "Moderation check failed" },
      { status: 500 }
    );
  }
}
