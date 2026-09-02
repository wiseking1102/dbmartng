import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";
import { recordSocialProof } from "@/lib/social-proof";

const BLOCKED_PATTERNS = [
  /\b(buy\s+now|click\s+here|free\s+money|work\s+from\s+home|act\s+now|limited\s+time|don't\s+miss\s+out)\b/gi,
  /\b(casino|gambling|porn|xxx|escort|adult|nude|nsfw)\b/gi,
];

type AuthenticatedUser = {
  id: string;
  email?: string | null;
};

type VendorProfile = {
  id: string;
  user_id: string;
  subscription_status: string | null;
};

type ListingOwnership = {
  id: string;
  vendor_id: string;
};

function getDb() {
  return createAdminClient() as any;
}

function moderateText(text: string): {
  flagged: boolean;
  reason?: string;
} {
  for (const pattern of BLOCKED_PATTERNS) {
    pattern.lastIndex = 0;

    if (pattern.test(text)) {
      return {
        flagged: true,
        reason: "Content contains prohibited patterns",
      };
    }
  }

  const emojiRegex =
    /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;

  const emojiMatches = text.match(emojiRegex);

  if (emojiMatches && emojiMatches.length > 10) {
    return {
      flagged: true,
      reason: "Excessive emoji usage not allowed",
    };
  }

  return {
    flagged: false,
  };
}

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();

  return token || null;
}

async function getAuthenticatedUser(
  request: Request
): Promise<AuthenticatedUser | null> {
  const token = getBearerToken(request);

  if (!token) {
    return null;
  }

  try {
    const db = getDb();

    const {
      data: authData,
      error,
    } = await db.auth.getUser(token);

    if (error || !authData?.user) {
      return null;
    }

    return {
      id: authData.user.id,
      email: authData.user.email ?? null,
    };
  } catch (error) {
    console.error(
      "Vendor listings authentication error:",
      error
    );

    return null;
  }
}

async function getVendorProfile(
  userId: string
): Promise<VendorProfile | null> {
  const db = getDb();

  const {
    data,
    error,
  } = await db
    .from("vendor_profiles")
    .select(
      "id, user_id, subscription_status"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error(
      "Vendor profile lookup error:",
      error
    );

    throw new Error(
      "Failed to load vendor profile"
    );
  }

  return data as VendorProfile | null;
}

async function verifyListingOwnership(
  listingId: string,
  vendorId: string
): Promise<ListingOwnership | null> {
  const db = getDb();

  const {
    data,
    error,
  } = await db
    .from("listings")
    .select("id, vendor_id")
    .eq("id", listingId)
    .maybeSingle();

  if (error) {
    console.error(
      "Listing ownership lookup error:",
      error
    );

    throw new Error(
      "Failed to verify listing ownership"
    );
  }

  if (!data || data.vendor_id !== vendorId) {
    return null;
  }

  return data as ListingOwnership;
}

function parseOptionalPrice(
  value: unknown
): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    value === null ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(
      "Price must be a valid positive number"
    );
  }

  return parsed;
}

function normalizeTags(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter(
          (tag): tag is string =>
            typeof tag === "string"
        )
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 20)
    )
  );
}

function normalizeImageUrls(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter(
          (url): url is string =>
            typeof url === "string"
        )
        .map((url) => url.trim())
        .filter(Boolean)
        .slice(0, 10)
    )
  );
}

function normalizeBoolean(
  value: unknown
): boolean {
  return value === true;
}

function normalizeText(
  value: unknown,
  maxLength: number
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .slice(0, maxLength);
}

/**
 * GET /api/vendor/listings
 *
 * The authenticated user is determined from the
 * Supabase access token, never from a client-supplied
 * userId.
 */
export async function GET(
  request: Request
) {
  try {
    const authenticatedUser =
      await getAuthenticatedUser(request);

    if (!authenticatedUser) {
      return NextResponse.json(
        {
          error:
            "Authentication required",
        },
        { status: 401 }
      );
    }

    const vendorProfile =
      await getVendorProfile(
        authenticatedUser.id
      );

    if (!vendorProfile) {
      return NextResponse.json(
        {
          error:
            "Vendor profile not found",
        },
        { status: 404 }
      );
    }

    const db = getDb();

    const {
      data,
      error,
    } = await db
      .from("listings")
      .select("*")
      .eq(
        "vendor_id",
        vendorProfile.id
      )
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Listings fetch error:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Failed to fetch listings",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data ?? [],
    });
  } catch (error) {
    console.error(
      "Vendor listings GET error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vendor/listings
 */
export async function POST(
  request: Request
) {
  try {
    const authenticatedUser =
      await getAuthenticatedUser(request);

    if (!authenticatedUser) {
      return NextResponse.json(
        {
          error:
            "Authentication required",
        },
        { status: 401 }
      );
    }

    const body =
      await request.json();

    const title = normalizeText(
      body?.title,
      150
    );

    const description =
      normalizeText(
        body?.description,
        5000
      );

    if (!title) {
      return NextResponse.json(
        {
          error:
            "Listing title is required",
        },
        { status: 400 }
      );
    }

    const vendorProfile =
      await getVendorProfile(
        authenticatedUser.id
      );

    if (!vendorProfile) {
      return NextResponse.json(
        {
          error:
            "Vendor profile not found",
        },
        { status: 404 }
      );
    }

    const moderationResult =
      moderateText(
        [title, description].join(" ")
      );

    if (moderationResult.flagged) {
      return NextResponse.json(
        {
          error:
            "Your listing contains content that doesn't meet our guidelines. Please revise and try again.",
          moderationFlag: true,
          reason:
            moderationResult.reason,
        },
        { status: 400 }
      );
    }

    const price =
      parseOptionalPrice(
        body?.price
      );

    const pricePeriod =
      body?.pricePeriod
        ? normalizeText(
            body.pricePeriod,
            50
          )
        : null;

    const categoryId =
      typeof body?.categoryId ===
      "string" &&
      body.categoryId.trim()
        ? body.categoryId.trim()
        : null;

    const isService =
      normalizeBoolean(
        body?.isService
      );

    const tags =
      normalizeTags(body?.tags);

    const imageUrls =
      normalizeImageUrls(
        body?.imageUrls
      );

    const baseSlug =
      slugify(title) ||
      `listing-${Date.now()}`;

    const slug =
      `${baseSlug}-${Date.now().toString(36)}`;

    const db = getDb();

    const {
      data,
      error,
    } = await db
      .from("listings")
      .insert({
        vendor_id:
          vendorProfile.id,
        title,
        slug,
        description:
          description || null,
        price:
          price === undefined
            ? null
            : price,
        price_period:
          pricePeriod,
        category_id:
          categoryId,
        image_urls:
          imageUrls,
        status:
          "pending_review",
        is_service:
          isService,
        tags,
      })
      .select()
      .single();

    if (error) {
      console.error(
        "Listing creation error:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Failed to create listing",
        },
        { status: 500 }
      );
    }

    try {
      const {
        data: profile,
      } = await db
        .from("vendor_profiles")
        .select("business_name")
        .eq(
          "id",
          vendorProfile.id
        )
        .maybeSingle();

      await recordSocialProof({
        activity_type:
          "listing_added",
        actor_name:
          profile?.business_name ||
          "A vendor",
        actor_role:
          "vendor",
        target_name:
          data?.title || title,
        target_type:
          "listing",
        target_url:
          `/vendors/${slug}`,
      });
    } catch (socialProofError) {
      console.error(
        "Social proof recording failed:",
        socialProofError
      );
    }

    return NextResponse.json(
      {
        success: true,
        data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Create listing error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/vendor/listings
 */
export async function PUT(
  request: Request
) {
  try {
    const authenticatedUser =
      await getAuthenticatedUser(request);

    if (!authenticatedUser) {
      return NextResponse.json(
        {
          error:
            "Authentication required",
        },
        { status: 401 }
      );
    }

    const body =
      await request.json();

    const listingId =
      typeof body?.listingId ===
      "string"
        ? body.listingId.trim()
        : "";

    if (!listingId) {
      return NextResponse.json(
        {
          error:
            "listingId is required",
        },
        { status: 400 }
      );
    }

    const vendorProfile =
      await getVendorProfile(
        authenticatedUser.id
      );

    if (!vendorProfile) {
      return NextResponse.json(
        {
          error:
            "Vendor profile not found",
        },
        { status: 404 }
      );
    }

    const ownership =
      await verifyListingOwnership(
        listingId,
        vendorProfile.id
      );

    if (!ownership) {
      return NextResponse.json(
        {
          error:
            "Listing not found or access denied",
        },
        { status: 404 }
      );
    }

    const title =
      body?.title !== undefined
        ? normalizeText(
            body.title,
            150
          )
        : undefined;

    const description =
      body?.description !== undefined
        ? normalizeText(
            body.description,
            5000
          )
        : undefined;

    if (
      title !== undefined &&
      !title
    ) {
      return NextResponse.json(
        {
          error:
            "Listing title cannot be empty",
        },
        { status: 400 }
      );
    }

    const moderationResult =
      moderateText(
        [
          title ?? "",
          description ?? "",
        ].join(" ")
      );

    if (moderationResult.flagged) {
      return NextResponse.json(
        {
          error:
            "Your listing contains content that doesn't meet our guidelines.",
          moderationFlag: true,
          reason:
            moderationResult.reason,
        },
        { status: 400 }
      );
    }

    const price =
      parseOptionalPrice(
        body?.price
      );

    const updateData: Record<
      string,
      unknown
    > = {};

    if (
      title !== undefined
    ) {
      updateData.title = title;
    }

    if (
      description !== undefined
    ) {
      updateData.description =
        description || null;
    }

    if (
      body?.price !== undefined
    ) {
      updateData.price =
        price === undefined
          ? null
          : price;
    }

    if (
      body?.pricePeriod !==
      undefined
    ) {
      updateData.price_period =
        body.pricePeriod
          ? normalizeText(
              body.pricePeriod,
              50
            )
          : null;
    }

    if (
      body?.categoryId !==
      undefined
    ) {
      updateData.category_id =
        typeof body.categoryId ===
          "string" &&
        body.categoryId.trim()
          ? body.categoryId.trim()
          : null;
    }

    if (
      body?.isService !==
      undefined
    ) {
      updateData.is_service =
        normalizeBoolean(
          body.isService
        );
    }

    if (
      body?.tags !== undefined
    ) {
      updateData.tags =
        normalizeTags(
          body.tags
        );
    }

    if (
      body?.imageUrls !==
      undefined
    ) {
      updateData.image_urls =
        normalizeImageUrls(
          body.imageUrls
        );
    }

    if (
      Object.keys(updateData)
        .length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "No changes were provided",
        },
        { status: 400 }
      );
    }

    /*
     * Any vendor edit requires moderation again.
     * The listing must return to review before
     * becoming publicly approved.
     */
    updateData.status =
      "pending_review";

    updateData.status_reason =
      null;

    updateData.reviewed_by =
      null;

    updateData.reviewed_at =
      null;

    const db = getDb();

    const {
      data,
      error,
    } = await db
      .from("listings")
      .update(updateData)
      .eq("id", listingId)
      .eq(
        "vendor_id",
        vendorProfile.id
      )
      .select()
      .single();

    if (error) {
      console.error(
        "Listing update error:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Failed to update listing",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "Update listing error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/vendor/listings
 */
export async function DELETE(
  request: Request
) {
  try {
    const authenticatedUser =
      await getAuthenticatedUser(request);

    if (!authenticatedUser) {
      return NextResponse.json(
        {
          error:
            "Authentication required",
        },
        { status: 401 }
      );
    }

    const body =
      await request.json();

    const listingId =
      typeof body?.listingId ===
      "string"
        ? body.listingId.trim()
        : "";

    if (!listingId) {
      return NextResponse.json(
        {
          error:
            "listingId is required",
        },
        { status: 400 }
      );
    }

    const vendorProfile =
      await getVendorProfile(
        authenticatedUser.id
      );

    if (!vendorProfile) {
      return NextResponse.json(
        {
          error:
            "Vendor profile not found",
        },
        { status: 404 }
      );
    }

    const ownership =
      await verifyListingOwnership(
        listingId,
        vendorProfile.id
      );

    if (!ownership) {
      return NextResponse.json(
        {
          error:
            "Listing not found or access denied",
        },
        { status: 404 }
      );
    }

    const db = getDb();

    const {
      error,
    } = await db
      .from("listings")
      .delete()
      .eq("id", listingId)
      .eq(
        "vendor_id",
        vendorProfile.id
      );

    if (error) {
      console.error(
        "Listing delete error:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Failed to delete listing",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Delete listing error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
      { status: 500 }
    );
  }
}
