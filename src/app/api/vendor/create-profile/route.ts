import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBearerUser } from "@/lib/auth/server-auth";
import { recordSocialProof } from "@/lib/social-proof";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return "";

  return phone.replace(/[^\d+]/g, "").trim();
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    /*
     * ------------------------------------------------------------
     * 1. Authenticate the actual Supabase user
     * ------------------------------------------------------------
     *
     * Never trust userId from the request body.
     */
    const authUser = await getBearerUser(request);

    if (!authUser) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = authUser.id;

    const body = await request.json();

    const {
      businessName,
      slug,
      description,
      categoryId,
      email,
      phone,
      whatsappNumber,
      website,
      address,
      city,
      state,
      verifiedPhone,
    } = body;

    /*
     * ------------------------------------------------------------
     * 2. Basic validation
     * ------------------------------------------------------------
     */
    if (
      typeof businessName !== "string" ||
      businessName.trim().length < 2
    ) {
      return NextResponse.json(
        { error: "Business name must be at least 2 characters." },
        { status: 400 }
      );
    }

    if (businessName.trim().length > 150) {
      return NextResponse.json(
        { error: "Business name is too long." },
        { status: 400 }
      );
    }

    if (typeof slug !== "string" || !SLUG_RE.test(slug)) {
      return NextResponse.json(
        { error: "Invalid business profile URL." },
        { status: 400 }
      );
    }

    if (description != null) {
      if (typeof description !== "string") {
        return NextResponse.json(
          { error: "Invalid business description." },
          { status: 400 }
        );
      }

      if (description.length > 500) {
        return NextResponse.json(
          { error: "Business description cannot exceed 500 characters." },
          { status: 400 }
        );
      }
    }

    /*
     * ------------------------------------------------------------
     * 3. Validate category
     * ------------------------------------------------------------
     */
    if (!categoryId || typeof categoryId !== "string") {
      return NextResponse.json(
        { error: "Please select a business category." },
        { status: 400 }
      );
    }

    if (!UUID_RE.test(categoryId)) {
      return NextResponse.json(
        { error: "Invalid business category." },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    const { data: category, error: categoryError } = await adminClient
      .from("categories")
      .select("id, name, slug, type, is_active")
      .eq("id", categoryId)
      .maybeSingle();

    if (categoryError) {
      console.error("Category lookup error:", categoryError);

      return NextResponse.json(
        { error: "Unable to verify the selected category." },
        { status: 500 }
      );
    }

    if (!category || !category.is_active) {
      return NextResponse.json(
        { error: "The selected category is no longer available." },
        { status: 400 }
      );
    }

    /*
     * ------------------------------------------------------------
     * 4. Verify that the authenticated user is actually a vendor
     * ------------------------------------------------------------
     */
    const { data: userProfile, error: userProfileError } =
      await adminClient
        .from("users")
        .select("id, role")
        .eq("id", userId)
        .maybeSingle();

    if (userProfileError) {
      console.error("User profile lookup error:", userProfileError);

      return NextResponse.json(
        { error: "Unable to verify your account." },
        { status: 500 }
      );
    }

    if (!userProfile) {
      return NextResponse.json(
        { error: "Your account profile could not be found." },
        { status: 403 }
      );
    }

    if (userProfile.role !== "vendor") {
      return NextResponse.json(
        { error: "Only vendor accounts can create vendor profiles." },
        { status: 403 }
      );
    }

    /*
     * ------------------------------------------------------------
     * 5. Prevent duplicate vendor profiles
     * ------------------------------------------------------------
     */
    const { data: existingProfile, error: existingProfileError } =
      await adminClient
        .from("vendor_profiles")
        .select("id, slug")
        .eq("user_id", userId)
        .maybeSingle();

    if (existingProfileError) {
      console.error(
        "Existing vendor profile lookup error:",
        existingProfileError
      );

      return NextResponse.json(
        { error: "Unable to check your existing vendor profile." },
        { status: 500 }
      );
    }

    if (existingProfile) {
      return NextResponse.json(
        {
          error: "You already have a vendor profile.",
          profileId: existingProfile.id,
          slug: existingProfile.slug,
        },
        { status: 409 }
      );
    }

    /*
     * ------------------------------------------------------------
     * 6. Prevent duplicate slugs
     * ------------------------------------------------------------
     */
    const { data: existingSlug, error: slugError } = await adminClient
      .from("vendor_profiles")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (slugError) {
      console.error("Slug lookup error:", slugError);

      return NextResponse.json(
        { error: "Unable to check business profile URL." },
        { status: 500 }
      );
    }

    if (existingSlug) {
      return NextResponse.json(
        {
          error:
            "A business with this profile URL already exists. Please try again.",
        },
        { status: 409 }
      );
    }

    /*
     * ------------------------------------------------------------
     * 7. Verify the phone verification state
     * ------------------------------------------------------------
     *
     * The client is not trusted here.
     *
     * Supabase's authenticated user must actually have the verified
     * phone number that was verified during onboarding.
     */
    const normalizedVerifiedPhone = normalizePhone(verifiedPhone);
    const normalizedAuthPhone = normalizePhone(authUser.phone);

    if (
      !normalizedVerifiedPhone ||
      !normalizedAuthPhone ||
      normalizedVerifiedPhone !== normalizedAuthPhone
    ) {
      return NextResponse.json(
        {
          error:
            "Please verify your phone number before creating your vendor profile.",
        },
        { status: 400 }
      );
    }

    /*
     * ------------------------------------------------------------
     * 8. Validate optional website
     * ------------------------------------------------------------
     */
    const cleanWebsite =
      typeof website === "string" ? website.trim() : "";

    if (cleanWebsite && !isValidUrl(cleanWebsite)) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid website URL beginning with http:// or https://.",
        },
        { status: 400 }
      );
    }

    /*
     * ------------------------------------------------------------
     * 9. Clean optional fields
     * ------------------------------------------------------------
     */
    const cleanBusinessName = businessName.trim();

    const cleanDescription =
      typeof description === "string"
        ? description.trim() || null
        : null;

    const cleanEmail =
      typeof email === "string" ? email.trim() || null : null;

    const cleanPhone =
      typeof phone === "string"
        ? phone.trim() || null
        : null;

    const cleanWhatsapp =
      typeof whatsappNumber === "string"
        ? whatsappNumber.trim() || null
        : null;

    const cleanAddress =
      typeof address === "string"
        ? address.trim() || null
        : null;

    const cleanCity =
      typeof city === "string"
        ? city.trim() || null
        : null;

    const cleanState =
      typeof state === "string"
        ? state.trim() || null
        : null;

    /*
     * ------------------------------------------------------------
     * 10. Create the vendor profile
     * ------------------------------------------------------------
     */
    const { data, error } = await adminClient
      .from("vendor_profiles")
      .insert({
        user_id: userId,
        business_name: cleanBusinessName,
        slug,
        description: cleanDescription,
        category_id: categoryId,
        email: cleanEmail,
        phone: cleanPhone,
        whatsapp_number: cleanWhatsapp,
        website: cleanWebsite || null,
        address: cleanAddress,
        city: cleanCity,
        state: cleanState,
        country: "Nigeria",

        subscription_status: "trial",
        trial_started_at: new Date().toISOString(),
        trial_ends_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),

        is_verified: false,
      } as never)
      .select()
      .single();

    if (error) {
      console.error("Vendor profile creation error:", error);

      /*
       * Handle common database uniqueness conflicts gracefully.
       */
      if (error.code === "23505") {
        return NextResponse.json(
          {
            error:
              "A vendor profile with these details already exists.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Failed to create vendor profile." },
        { status: 500 }
      );
    }

    /*
     * ------------------------------------------------------------
     * 11. Record social proof
     * ------------------------------------------------------------
     */
    try {
      await recordSocialProof({
        activity_type: "vendor_joined",
        actor_name: cleanBusinessName,
        actor_role: "vendor",
        target_name: "DBMartNG",
        target_type: "vendor",
        target_url: `/vendors/${slug}`,
        metadata: {
          vendorId: (data as unknown as { id: string }).id,
        },
      });
    } catch (socialProofError) {
      /*
       * Social proof must never make successful registration fail.
       */
      console.error(
        "Social proof recording error:",
        socialProofError
      );
    }

    return NextResponse.json({
      success: true,
      data,
      slug,
      profileUrl: `/vendors/${slug}`,
    });
  } catch (error) {
    console.error("Create vendor profile error:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    /*
     * Identity comes from the authenticated session.
     */
    const authUser = await getBearerUser(request);

    if (!authUser) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = authUser.id;

    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const profileData = {
      ...body,
    };

    /*
     * Never allow ownership or protected fields to be changed
     * through this endpoint.
     */
    delete profileData.user_id;
    delete profileData.id;
    delete profileData.role;
    delete profileData.subscription_status;
    delete profileData.trial_started_at;
    delete profileData.trial_ends_at;
    delete profileData.is_verified;
    delete profileData.verified_badge_granted_at;
    delete profileData.is_vip;
    delete profileData.vip_invited_by;

    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from("vendor_profiles")
      .update(profileData as never)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Vendor profile update error:", error);

      return NextResponse.json(
        { error: "Failed to update vendor profile." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Update vendor profile error:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}