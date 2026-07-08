import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { identifier } = await request.json();

    if (!identifier || typeof identifier !== "string") {
      return NextResponse.json(
        { error: "Identifier is required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Check admin allowlist using service role (bypasses RLS)
    const { data, error } = await (adminClient
      .from("admin_allowlist")
      .select("identifier, identifier_type, claimed")
      .eq("identifier", identifier.toLowerCase().trim())
      .maybeSingle() as never) as unknown as { data: { claimed: boolean; identifier_type: string } | null; error: any };

    if (error) {
      console.error("Admin allowlist check error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      detected: !!data,
      claimed: data?.claimed ?? false,
      identifier_type: data?.identifier_type ?? null,
    });
  } catch (err) {
    console.error("Admin allowlist check error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
