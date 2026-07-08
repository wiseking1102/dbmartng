/**
 * POST /api/upload
 *
 * Uploads a file to Supabase Storage.
 * Accepts multipart/form-data with fields:
 *   - file: File to upload
 *   - bucket: Storage bucket name (e.g. "listing-images", "vendor-logos")
 *   - path: Optional custom path override (default: auto-generated)
 *
 * Returns the public URL of the uploaded file.
 *
 * @example
 *   const formData = new FormData();
 *   formData.append("file", file);
 *   formData.append("bucket", "listing-images");
 *   formData.append("userId", user.id);
 *
 *   const res = await fetch("/api/upload", { method: "POST", body: formData });
 *   const { url } = await res.json();
 */

import { NextResponse } from "next/server";
import {
  uploadFile,
  generateFilePath,
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE,
  STORAGE_BUCKETS,
} from "@/lib/supabase/storage";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const bucket = (formData.get("bucket") as string) || STORAGE_BUCKETS.LISTING_IMAGES;
    const userId = (formData.get("userId") as string) || "anonymous";

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
    if (!validBuckets.includes(bucket as any)) {
      return NextResponse.json(
        {
          error: `Invalid bucket "${bucket}". Valid: ${validBuckets.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // ─── Generate path & upload ───
    const filePath = generateFilePath(userId, file.name);
    const buffer = await file.arrayBuffer();

    const result = await uploadFile(bucket, filePath, buffer, file.type);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
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


