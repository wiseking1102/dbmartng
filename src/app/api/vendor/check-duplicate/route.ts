import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * POST /api/vendor/check-duplicate
 *
 * Checks for potential duplicate vendor profiles at signup.
 * Compares business name similarity and email/phone matches.
 * Returns a list of potential duplicates the user should be warned about.
 */
export async function POST(request: Request) {
  try {
    const { businessName, email, phone, userId } = await request.json();

    if (!businessName) {
      return NextResponse.json(
        { error: "businessName is required" },
        { status: 400 }
      );
    }

    // Verify the requesting user is authenticated
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || (userId && user.id !== userId)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();
    const duplicates: {
      business_name: string;
      slug: string;
      match_type: "name" | "email" | "phone";
    }[] = [];

    // 1. Check for exact business name match (case-insensitive)
    const { data: nameMatches } = await (adminClient
      .from("vendor_profiles")
      .select("business_name, slug")
      .ilike("business_name", businessName) as never) as unknown as { data: { business_name: string; slug: string }[] | null };

    if (nameMatches) {
      for (const match of nameMatches) {
        // Exact or very similar name
        const similarity = levenshteinRatio(
          businessName.toLowerCase(),
          match.business_name.toLowerCase()
        );
        if (similarity > 0.8) {
          duplicates.push({
            business_name: match.business_name,
            slug: match.slug,
            match_type: "name",
          });
        }
      }
    }

    // 2. Check for email match (if provided)
    if (email) {
      const { data: emailMatches } = await (adminClient
        .from("vendor_profiles")
        .select("business_name, slug")
        .eq("email", email) as never) as unknown as { data: { business_name: string; slug: string }[] | null };

      if (emailMatches) {
        for (const match of emailMatches) {
          if (!duplicates.find((d) => d.slug === match.slug)) {
            duplicates.push({
              business_name: match.business_name,
              slug: match.slug,
              match_type: "email",
            });
          }
        }
      }
    }

    // 3. Check for phone match (if provided)
    if (phone) {
      const { data: phoneMatches } = await (adminClient
        .from("vendor_profiles")
        .select("business_name, slug")
        .eq("phone", phone) as never) as unknown as { data: { business_name: string; slug: string }[] | null };

      if (phoneMatches) {
        for (const match of phoneMatches) {
          if (!duplicates.find((d) => d.slug === match.slug)) {
            duplicates.push({
              business_name: match.business_name,
              slug: match.slug,
              match_type: "phone",
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      hasDuplicates: duplicates.length > 0,
      duplicates,
    });
  } catch (err) {
    console.error("[vendor/check-duplicate] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Simple Levenshtein ratio for name similarity comparison.
 * Returns 0 (completely different) to 1 (identical).
 */
function levenshteinRatio(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const distance = matrix[b.length][a.length];
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - distance / maxLen;
}
