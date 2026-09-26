import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/contact — public contact form endpoint.
 *
 * Validates everything server-side, rate-limits by IP and email,
 * and persists to contact_messages for the admin support workflow.
 */
export async function POST(request: Request) {
  try {
    let body: Record<string, unknown> = {};

    try {
      const parsed = await request.json();
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        body = parsed as Record<string, unknown>;
      }
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    // Honeypot: real users never fill this hidden field
    if (typeof body.website === "string" && body.website.trim()) {
      return NextResponse.json({ success: true });
    }

    const fullName =
      typeof body.name === "string" ? body.name.trim() :
      typeof body.full_name === "string" ? body.full_name.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone =
      typeof body.phone === "string" ? body.phone.trim().slice(0, 30) : "";
    const subject =
      typeof body.subject === "string" ? body.subject.trim().slice(0, 200) : "";
    const message =
      typeof body.message === "string" ? body.message.trim() : "";

    if (!fullName || fullName.length < 2 || fullName.length > 100) {
      return NextResponse.json({ error: "Please provide your name (2-100 characters)." }, { status: 400 });
    }

    if (!EMAIL_RE.test(email) || email.length > 200) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    if (!message || message.length < 10 || message.length > 5000) {
      return NextResponse.json({ error: "Message must be between 10 and 5000 characters." }, { status: 400 });
    }

    // Rate limit: 5 per hour per IP and per email
    const ip = getClientIp(request);
    const byIp = await consumeRateLimit(ip, "contact", 5, 60);
    const byEmail = await consumeRateLimit(`email:${email}`, "contact", 5, 60);

    if (!byIp || !byEmail) {
      return NextResponse.json(
        { error: "Too many messages sent. Please try again later." },
        { status: 429 }
      );
    }

    const adminClient = createAdminClient() as any;

    const { error } = await adminClient.from("contact_messages").insert({
      full_name: fullName,
      email,
      phone: phone || null,
      subject: subject || null,
      message,
      status: "new",
    } as never);

    if (error) {
      console.error("[contact] insert error:", error);
      return NextResponse.json(
        { error: "Failed to send your message. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[contact] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
