import { NextResponse } from "next/server";
import { getPublicKey } from "@/lib/paystack/keys";

/**
 * GET /api/paystack/public-key
 *
 * Returns the Paystack public key from the database (platform_settings).
 * The frontend calls this to initialize the Paystack checkout popup.
 *
 * Returns { publicKey: "pk_..." } or 404 if not configured.
 */
export async function GET() {
  try {
    const publicKey = await getPublicKey();

    if (!publicKey) {
      return NextResponse.json(
        { error: "Paystack public key is not configured. Set it in Admin → Settings → Paystack." },
        { status: 404 }
      );
    }

    return NextResponse.json({ publicKey });
  } catch (err) {
    console.error("[Paystack Public Key] Error:", err);
    return NextResponse.json(
      { error: "Failed to retrieve Paystack configuration" },
      { status: 500 }
    );
  }
}
