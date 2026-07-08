import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { email, userId, fullName } = await request.json();

    if (!email || !userId) {
      return NextResponse.json(
        { error: "Email and userId are required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const normalizedEmail = email.toLowerCase().trim();

    // Verify the identifier is in the allowlist and not yet claimed
    const { data: allowlistEntry, error: lookupError } = await (adminClient
      .from("admin_allowlist")
      .select("*")
      .eq("identifier", normalizedEmail)
      .maybeSingle() as never) as unknown as { data: { claimed: boolean } | null; error: any };

    if (lookupError) {
      console.error("Allowlist lookup error:", lookupError);
      return NextResponse.json(
        { error: "Failed to verify admin identifier" },
        { status: 500 }
      );
    }

    if (!allowlistEntry) {
      return NextResponse.json(
        { error: "Identifier not found in admin allowlist" },
        { status: 403 }
      );
    }

    if (allowlistEntry.claimed) {
      return NextResponse.json(
        { error: "Admin identifier already claimed" },
        { status: 409 }
      );
    }

    // Create user profile with admin role (using service role bypasses RLS)
    const { error: insertError } = await adminClient.from("users").insert({
      id: userId,
      email: normalizedEmail,
      role: "admin",
      full_name: fullName || null,
    } as never);

    if (insertError) {
      console.error("User creation error:", insertError);
      return NextResponse.json(
        { error: "Failed to create admin user" },
        { status: 500 }
      );
    }

    // Mark allowlist as claimed
    const { error: claimError } = await adminClient
      .from("admin_allowlist")
      .update({
        claimed: true,
        linked_user_id: userId,
      } as never)
      .eq("identifier", normalizedEmail);

    if (claimError) {
      console.error("Claim error:", claimError);
      return NextResponse.json(
        { error: "Failed to claim admin identifier" },
        { status: 500 }
      );
    }

    // Log to audit trail
    const { error: auditError } = await adminClient
      .from("admin_audit_log")
      .insert({
        admin_user_id: userId,
        action: "admin_account_created",
        new_value: { email: normalizedEmail, is_first_setup: true },
      } as never);

    if (auditError) {
      console.error("Audit log error:", auditError);
      // Non-fatal - don't block setup for audit failure
    }

    return NextResponse.json({
      success: true,
      message: "Admin account created successfully",
    });
  } catch (err) {
    console.error("Admin setup error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
