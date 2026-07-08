import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordSocialProof } from "@/lib/social-proof";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, businessName, slug, description, categoryId, email, phone, whatsappNumber, website, address, city, state } = body;

    if (!userId || !businessName || !slug) {
      return NextResponse.json(
        { error: "userId, businessName, and slug are required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Check if slug already exists
    const { data: existingSlug } = await (adminClient
      .from("vendor_profiles")
      .select("id")
      .eq("slug", slug)
      .maybeSingle() as never) as unknown as { data: { id: string } | null };

    if (existingSlug) {
      return NextResponse.json(
        { error: "A business with this name already exists. Please use a different name." },
        { status: 409 }
      );
    }

    // Create vendor profile with trial subscription
    const { data, error } = await adminClient
      .from("vendor_profiles")
      .insert({
        user_id: userId,
        business_name: businessName,
        slug,
        description: description || null,
        category_id: categoryId || null,
        email: email || null,
        phone: phone || null,
        whatsapp_number: whatsappNumber || null,
        website: website || null,
        address: address || null,
        city: city || null,
        state: state || null,
        country: "Nigeria",
        subscription_status: "trial",
        trial_started_at: new Date().toISOString(),
        trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_verified: false,
      } as never)
      .select()
      .single();

    if (error) {
      console.error("Vendor profile creation error:", error);
      return NextResponse.json(
        { error: "Failed to create vendor profile" },
        { status: 500 }
      );
    }

    // Record social proof for new vendor
    recordSocialProof({
      activity_type: "vendor_joined",
      actor_name: businessName,
      actor_role: "vendor",
      target_name: "DBMartNG",
      target_type: "vendor",
      target_url: `/vendors/${slug}`,
      metadata: { vendorId: (data as unknown as { id: string }).id },
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Create vendor profile error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { userId, ...profileData } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

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
        { error: "Failed to update vendor profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Update vendor profile error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
