import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";
import { recordSocialProof } from "@/lib/social-proof";

// ─── Basic Profanity/Spam Text Moderation ───
const BLOCKED_PATTERNS = [
  /\b(buy\s+now|click\s+here|free\s+money|work\s+from\s+home|act\s+now|limited\s+time|don't\s+miss\s+out)\b/gi,
  /\b(casino|gambling|porn|xxx|escort|adult|nude|nsfw)\b/gi,
];

function moderateText(text: string): { flagged: boolean; reason?: string } {
  // Check for blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return { flagged: true, reason: "Content contains prohibited patterns" };
    }
  }

  // Check for excessive emoji usage (more than 30% of text or 10+ emojis)
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const emojiMatches = text.match(emojiRegex);
  if (emojiMatches && emojiMatches.length > 10) {
    return { flagged: true, reason: "Excessive emoji usage not allowed" };
  }
  
  return { flagged: false };
}

// ─── GET /api/vendor/listings?userId=xxx ───
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const adminClient = createAdminClient();

    // Get vendor profile id from user id
    const { data: vendorProfile } = await (adminClient
      .from("vendor_profiles")
      .select("id")
      .eq("user_id", userId)
      .single() as never) as unknown as { data: { id: string } | null };

    if (!vendorProfile) {
      return NextResponse.json(
        { error: "Vendor profile not found" },
        { status: 404 }
      );
    }

    const { data, error } = await adminClient
      .from("listings")
      .select("*")
      .eq("vendor_id", vendorProfile.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Listings fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch listings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Listings fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST /api/vendor/listings ───
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, title, description, price, pricePeriod, categoryId, isService, tags, imageUrls } = body;

    if (!userId || !title) {
      return NextResponse.json(
        { error: "userId and title are required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Get vendor profile
    const { data: vendorProfile } = await (adminClient
      .from("vendor_profiles")
      .select("id, subscription_status")
      .eq("user_id", userId)
      .single() as never) as unknown as { data: { id: string; subscription_status: string } | null };

    if (!vendorProfile) {
      return NextResponse.json(
        { error: "Vendor profile not found" },
        { status: 404 }
      );
    }

    // ─── Run automated text moderation ───
    const moderationResult = moderateText(
      [title, description || ""].join(" ")
    );

    if (moderationResult.flagged) {
      return NextResponse.json(
        {
          error: "Your listing contains content that doesn't meet our guidelines. Please revise and try again.",
          moderationFlag: true,
        },
        { status: 400 }
      );
    }

    // Generate unique slug
    const baseSlug = slugify(title);
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    // Create listing with pending_review status
    const { data, error } = await adminClient
      .from("listings")        .insert({
        vendor_id: vendorProfile.id,
        title: title.trim(),
        slug,
        description: description?.trim() || null,
        price: price ? parseFloat(price) : null,
        price_period: pricePeriod || null,
        category_id: categoryId || null,
        image_urls: imageUrls || [],
        status: "pending_review",
        is_service: isService || false,
        tags: tags || [],
      } as never)
      .select()
      .single();

    if (error) {
      console.error("Listing creation error:", error);
      return NextResponse.json(
        { error: "Failed to create listing" },
        { status: 500 }
      );
    }

    // Record social proof for new listing
    if (data) {
      // Fire-and-forget: get vendor name for the social proof
      const { data: profile } = await (adminClient
        .from("vendor_profiles")
        .select("business_name")
        .eq("id", vendorProfile.id)
        .single() as never) as unknown as { data: { business_name: string } | null };
      
      recordSocialProof({
        activity_type: "listing_added",
        actor_name: (profile as unknown as { business_name: string })?.business_name || "A vendor",
        actor_role: "vendor",
        target_name: (data as unknown as { title: string }).title,
        target_type: "listing",
        target_url: `/vendors/${slug}`,  // slug is defined in this scope for new listings
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Create listing error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PUT /api/vendor/listings ───
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { userId, listingId, title, description, price, pricePeriod, categoryId, isService, tags, imageUrls } = body;

    if (!userId || !listingId) {
      return NextResponse.json(
        { error: "userId and listingId are required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Verify ownership
    const { data: vendorProfile } = await (adminClient
      .from("vendor_profiles")
      .select("id")
      .eq("user_id", userId)
      .single() as never) as unknown as { data: { id: string } | null };

    if (!vendorProfile) {
      return NextResponse.json(
        { error: "Vendor profile not found" },
        { status: 404 }
      );
    }

    // Check listing belongs to vendor
    const { data: existingListing } = await (adminClient
      .from("listings")
      .select("id, vendor_id")
      .eq("id", listingId)
      .single() as never) as unknown as { data: { id: string; vendor_id: string } | null };

    if (!existingListing || existingListing.vendor_id !== vendorProfile.id) {
      return NextResponse.json(
        { error: "Listing not found or access denied" },
        { status: 404 }
      );
    }

    // Run text moderation on updates too
    const textToCheck = [title || "", description || ""].join(" ");
    if (textToCheck.trim()) {
      const moderationResult = moderateText(textToCheck);
      if (moderationResult.flagged) {
        return NextResponse.json(
          {
            error: "Your listing contains content that doesn't meet our guidelines.",
            moderationFlag: true,
          },
          { status: 400 }
        );
      }
    }

    // Update the listing - reset to pending_review on edit
    const { data, error } = await adminClient
      .from("listings")
      .update({
        title: title?.trim(),
        description: description?.trim(),
        price: price !== undefined ? parseFloat(price) : undefined,
        price_period: pricePeriod,
        category_id: categoryId,
        image_urls: imageUrls,
        is_service: isService,
        tags: tags,
        status: "pending_review",  // Reset to pending_review on edit
        status_reason: null,
        reviewed_by: null,
        reviewed_at: null,
      } as never)
      .eq("id", listingId)
      .select()
      .single();

    if (error) {
      console.error("Listing update error:", error);
      return NextResponse.json(
        { error: "Failed to update listing" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Update listing error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/vendor/listings ───
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { userId, listingId } = body;

    if (!userId || !listingId) {
      return NextResponse.json(
        { error: "userId and listingId are required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Verify ownership
    const { data: vendorProfile } = await (adminClient
      .from("vendor_profiles")
      .select("id")
      .eq("user_id", userId)
      .single() as never) as unknown as { data: { id: string } | null };

    if (!vendorProfile) {
      return NextResponse.json(
        { error: "Vendor profile not found" },
        { status: 404 }
      );
    }

    const { data: existingListing } = await (adminClient
      .from("listings")
      .select("id, vendor_id")
      .eq("id", listingId)
      .single() as never) as unknown as { data: { id: string; vendor_id: string } | null };

    if (!existingListing || existingListing.vendor_id !== vendorProfile.id) {
      return NextResponse.json(
        { error: "Listing not found or access denied" },
        { status: 404 }
      );
    }

    const { error } = await adminClient
      .from("listings")
      .delete()
      .eq("id", listingId);

    if (error) {
      console.error("Listing delete error:", error);
      return NextResponse.json(
        { error: "Failed to delete listing" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete listing error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
