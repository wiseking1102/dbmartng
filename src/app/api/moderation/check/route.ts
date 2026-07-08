import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * POST /api/moderation/check
 *
 * Moderates text content (listings, messages) using basic heuristics.
 * Checks for: profanity, spam patterns, phone numbers, URLs in name fields.
 *
 * Returns: { flagged: boolean, reasons: string[] }
 *
 * In production, this should be extended with:
 * - Google Cloud Vision / Perspective API for image & text AI moderation
 * - Custom blocklist management via admin panel
 */
export async function POST(request: Request) {
  try {
    // Verify user is authenticated to prevent anonymous abuse
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content, type } = await request.json();

    if (!content || !type) {
      return NextResponse.json(
        { error: "content and type are required" },
        { status: 400 }
      );
    }

    const reasons: string[] = [];
    const text = String(content).toLowerCase().trim();

    if (!text) {
      return NextResponse.json({ flagged: false, reasons: [] });
    }

    // 1. Check for excessive capitalization (SHOUTING)
    const uppercaseRatio =
      String(content).replace(/[^a-zA-Z]/g, "").length > 0
        ? String(content).replace(/[^A-Z]/g, "").length /
          String(content).replace(/[^a-zA-Z]/g, "").length
        : 0;
    if (uppercaseRatio > 0.7 && String(content).length > 20) {
      reasons.push("Excessive capitalization");
    }

    // 2. Check for repeated characters (spam signal)
    const repeatPattern = /(.)\1{4,}/;
    if (repeatPattern.test(text)) {
      reasons.push("Repeated characters detected");
    }

    // 3. Check for common spam keywords
    const spamKeywords = [
      "buy followers", "cheap likes", "click here", "act now",
      "limited offer", "free money", "congratulations you won",
      "earn money fast", "work from home earn", "$$$",
    ];
    for (const keyword of spamKeywords) {
      if (text.includes(keyword)) {
        reasons.push(`Spam content detected: "${keyword}"`);
        break;
      }
    }

    // 4. Check for excessive links (more than 2 URLs)
    const urlMatches = text.match(/https?:\/\/[^\s]+/g);
    if (urlMatches && urlMatches.length > 2) {
      reasons.push("Excessive URLs");
    }

    // 5. Check for phone numbers in title/name fields
    if (type === "title" || type === "name") {
      const phonePatterns = [
        /\b\d{11}\b/,           // 11 digits (Nigerian mobile)
        /\b0\d{10}\b/,          // 0 followed by 10 digits
        /\b\d{4}[\s-]?\d{3}[\s-]?\d{4}\b/,  // Common formats
      ];
      for (const pattern of phonePatterns) {
        if (pattern.test(text)) {
          reasons.push("Phone number detected in name/title field");
          break;
        }
      }
    }

    // 6. Check for common profanity (basic blocklist)
    const blocklist = [
      "fuck", "shit", "asshole", "bastard", "damn",
      "scam", "fraud", "illegal", "drugs",
    ];
    for (const word of blocklist) {
      // Check whole word, not substring (avoid false positives like "class" matching "ass")
      const wordPattern = new RegExp(`\\b${word}\\b`, "i");
      if (wordPattern.test(text)) {
        reasons.push("Inappropriate language detected");
        break;
      }
    }

    // 7. Check for HTML injection attempts
    const htmlPatterns = [
      /<script[\s>]/i,
      /javascript:/i,
      /onerror=/i,
      /onclick=/i,
      /onload=/i,
    ];
    for (const pattern of htmlPatterns) {
      if (pattern.test(text)) {
        reasons.push("Suspicious HTML/script content detected");
        break;
      }
    }

    return NextResponse.json({
      flagged: reasons.length > 0,
      reasons,
      score: reasons.length > 3 ? "high" : reasons.length > 1 ? "medium" : "low",
    });
  } catch (err) {
    console.error("[moderation/check] Error:", err);
    return NextResponse.json(
      { error: "Moderation check failed" },
      { status: 500 }
    );
  }
}
