import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Missing captcha token" },
        { status: 400 }
      );
    }

    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    const secretKey = process.env.TURNSTILE_SECRET_KEY;

    if (!siteKey || !secretKey) {
      console.error(
        "[verify-captcha] Missing Turnstile configuration:",
        { hasSiteKey: !!siteKey, hasSecretKey: !!secretKey }
      );
      return NextResponse.json(
        { success: false, error: "CAPTCHA is not configured" },
        { status: 500 }
      );
    }

    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token);

    const result = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: formData,
      }
    );

    const outcome = await result.json();

    if (!outcome.success) {
      return NextResponse.json(
        { success: false, error: "CAPTCHA verification failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[verify-captcha] Error:", error);
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}
