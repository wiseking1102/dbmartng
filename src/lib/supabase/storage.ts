/**
 * Supabase Storage utility for DBMartNG.
 *
 * Used for all file uploads: vendor logos, listing photos, gallery images,
 * company ad banners, etc.
 *
 * ⚠️ This is a temporary replacement for Cloudflare R2.
 * When R2 keys are available, swap this file for an R2-compatible S3 client.
 *
 * Bucket structure:
 *   vendor-logos/       → Vendor profile logos
 *   vendor-cover/       → Vendor cover images
 *   listing-images/     → Listing photos & gallery
 *   company-ads/        → Admin-created advertisement banners
 */

import { createAdminClient } from "./admin";

// ─── Bucket Names ──────────────────────────────────────────

export const STORAGE_BUCKETS = {
  VENDOR_LOGOS: "vendor-logos",
  VENDOR_COVER: "vendor-cover",
  LISTING_IMAGES: "listing-images",
  COMPANY_ADS: "company-ads",
} as const;

// ─── Upload File ───────────────────────────────────────────

/**
 * Upload a file to Supabase Storage.
 *
 * @param bucket - The storage bucket name
 * @param path - The file path within the bucket (e.g. `userId/filename.jpg`)
 * @param file - The file data (ArrayBuffer or Blob)
 * @param contentType - MIME type of the file
 * @returns The public URL of the uploaded file
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: ArrayBuffer | Blob,
  contentType: string
): Promise<{ url: string; error?: string }> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error(`[Storage] Upload error (${bucket}/${path}):`, error);
      return { url: "", error: error.message };
    }

    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return { url: publicUrlData.publicUrl };
  } catch (err) {
    console.error("[Storage] Unexpected upload error:", err);
    return {
      url: "",
      error: err instanceof Error ? err.message : "Upload failed",
    };
  }
}

// ─── Delete File ───────────────────────────────────────────

/**
 * Delete a file from Supabase Storage.
 *
 * @param bucket - The storage bucket name
 * @param path - The file path within the bucket
 */
export async function deleteFile(
  bucket: string,
  path: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      console.error(`[Storage] Delete error (${bucket}/${path}):`, error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[Storage] Unexpected delete error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Delete failed",
    };
  }
}

// ─── List Files ────────────────────────────────────────────

/**
 * List all files in a bucket path.
 *
 * @param bucket - The storage bucket name
 * @param prefix - Optional path prefix to filter by
 */
export async function listFiles(
  bucket: string,
  prefix?: string
): Promise<{ files: { name: string; url: string }[]; error?: string }> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix || "", { sortBy: { column: "created_at", order: "desc" } });

    if (error) {
      console.error(`[Storage] List error (${bucket}):`, error);
      return { files: [], error: error.message };
    }

    const files = (data || []).map((file) => ({
      name: file.name,
      url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}${prefix ? "/" + prefix : ""}/${file.name}`,
    }));

    return { files };
  } catch (err) {
    console.error("[Storage] Unexpected list error:", err);
    return {
      files: [],
      error: err instanceof Error ? err.message : "List failed",
    };
  }
}

// ─── Generate Unique File Path ────────────────────────────

/**
 * Generate a unique file path for storage.
 * Format: `{userId}/{timestamp}-{random}.{ext}`
 */
export function generateFilePath(
  userId: string,
  originalName: string
): string {
  const ext = originalName.split(".").pop() || "jpg";
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `${userId}/${timestamp}-${random}.${ext}`;
}

// ─── Allowed File Types & Limits ──────────────────────────

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

export const ALLOWED_FILE_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export const MAX_LISTING_IMAGES = 10;
