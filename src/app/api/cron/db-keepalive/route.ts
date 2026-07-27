import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("platform_settings")
      .select("key")
      .limit(1);

    if (error) {
      console.error("DB keep-alive query failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      queried: data?.length ?? 0,
    });
  } catch (err) {
    console.error("DB keep-alive error:", err);
    return NextResponse.json({ error: "Keep-alive failed" }, { status: 500 });
  }
}
