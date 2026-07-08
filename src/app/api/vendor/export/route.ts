import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function escapeCsv(val: unknown): string {
  const str = String(val ?? "");
  return `"${str.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is a vendor
    const { data: userData } = await (supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single() as never) as unknown as { data: { role: string } | null };

    if (userData?.role !== "vendor") {
      return NextResponse.json(
        { error: "Only vendors can export data" },
        { status: 403 }
      );
    }

    // Get vendor profile
    const { data: profile } = await (supabase
      .from("vendor_profiles")
      .select("id, business_name")
      .eq("user_id", user.id)
      .single() as never) as unknown as { data: { id: string; business_name: string } | null };

    if (!profile) {
      return NextResponse.json(
        { error: "Vendor profile not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "listings";

    if (type === "listings") {
      // Export listings as CSV
      const { data: listings } = await (supabase
        .from("listings")
        .select(
          "title, slug, description, price, price_period, status, is_service, tags, view_count, contact_click_count, created_at, updated_at"
        )
        .eq("vendor_id", (profile as unknown as { id: string }).id)
        .order("created_at", { ascending: false }) as never) as unknown as { data: Record<string, unknown>[] | null };

      const headers = [
        "Title",
        "Slug",
        "Description",
        "Price",
        "Price Period",
        "Status",
        "Is Service",
        "Tags",
        "View Count",
        "Contact Clicks",
        "Created At",
        "Updated At",
      ];

      const csvRows = [headers.join(",")];
      (listings || []).forEach((l: Record<string, unknown>) => {
        csvRows.push(
          [
            escapeCsv(l.title),
            escapeCsv(l.slug),
            escapeCsv(l.description),
            escapeCsv(l.price),
            escapeCsv(l.price_period),
            escapeCsv(l.status),
            escapeCsv(l.is_service ? "Yes" : "No"),
            escapeCsv((Array.isArray(l.tags) ? l.tags : []).join("; ")),
            escapeCsv(l.view_count),
            escapeCsv(l.contact_click_count),
            escapeCsv(l.created_at),
            escapeCsv(l.updated_at),
          ].join(",")
        );
      });

      return new NextResponse(csvRows.join("\n"), {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${profile.business_name.replace(/[^a-zA-Z0-9_]/g, "_")}_listings.csv"`,
        },
      });
    }

    return NextResponse.json(
      { error: "Invalid export type. Use ?type=listings" },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
