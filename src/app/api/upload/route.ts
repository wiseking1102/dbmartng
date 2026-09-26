/**
 * POST /api/upload
 *
 * Uploads an image to Supabase Storage on behalf of the
 * AUTHENTICATED user. Files are always stored under the
 * authenticated user's path — the browser cannot choose
 * whose folder it writes into.
 *
 * Accepts multipart/form-data:
 *   - file: image file (JPEG/PNG/WebP/AVIF/GIF, max 5MB)
 *   - bucket: one of the allowed buckets (default: listing-images)
 */
import { NextResponse } from "next/server";
import { getBearerUser } from "@/lib/auth/server-auth";
import {
  uploadFile,
  generateFilePath,
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE,
  STORAGE_BUCKETS,
} from "@/lib/supabase/storage";

export async function POST(request: Request) {
  try {
    // ─── Authentication: uploads require a signed-in user ────
    const user = await getBearerUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const bucketRaw = formData.get("bucket");
    const bucket =
      typeof bucketRaw === "string" && bucketRaw
        ? bucketRaw
        : STORAGE_BUCKETS.LISTING_IMAGES;

    // ─── Validate file exists ───
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // ─── Validate file type ───
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `File type "${file.type}" is not supported. Allowed: JPEG, PNG, WebP, AVIF, GIF`,
        },
        { status: 400 }
      );
    }

    // ─── Validate file size ───
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File is too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 }
      );
    }

    // ─── Validate bucket ───
    const validBuckets = Object.values(STORAGE_BUCKETS);
    if (!validBuckets.includes(bucket as (typeof validBuckets)[number])) {
      return NextResponse.json(
        {
          error: `Invalid bucket "${bucket}". Valid: ${validBuckets.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // ─── Path is always under the authenticated user's folder ──
    const filePath = generateFilePath(user.id, file.name);
    const buffer = await file.arrayBuffer();

    const result = await uploadFile(bucket, filePath, buffer, file.type);

    if (result.error) {
      console.error("[upload] storage error:", result.error);
      return NextResponse.json(
        { error: "Upload failed. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: result.url,
      path: filePath,
      bucket,
    });
  } catch (err) {
    console.error("[Upload] Error:", err);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
