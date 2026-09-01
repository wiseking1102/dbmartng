/**
 * Server-side user profile helper.
 * 
 * This is the SINGLE SOURCE OF TRUTH for:
 * - Getting authenticated user
 * - Resolving user role from database
 * - Fetching full user profile
 * 
 * Never expose service-role keys to browser.
 * Never trust client-side metadata for roles.
 * Always query the database for the authoritative role.
 */

import { createServerSupabaseClient } from "./server";
import type { Database } from "@/types/database";

export type UserRole = "buyer" | "vendor" | "admin" | "sub_admin";

export interface UserProfile {
  id: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorProfile extends Database["public"]["Tables"]["vendor_profiles"]["Row"] {}

/**
 * Get the current authenticated user's profile.
 * 
 * Returns user profile + role from database.
 * Throws if user is not authenticated.
 * Handles missing profile gracefully.
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, email, phone, role, full_name, avatar_url, created_at, updated_at")
      .eq("id", authUser.id)
      .maybeSingle();

    if (profileError) {
      console.error("[getCurrentUserProfile] Error fetching profile:", profileError);
      return null;
    }

    if (!profile) {
      // User is authenticated but has no profile record
      // This is an error state that should be handled
      console.warn(
        `[getCurrentUserProfile] User ${authUser.id} authenticated but no profile found`
      );
      return null;
    }

    return profile as UserProfile;
  } catch (err) {
    console.error("[getCurrentUserProfile] Unexpected error:", err);
    return null;
  }
}

/**
 * Get vendor profile for a user (if they are a vendor).
 * 
 * Returns vendor profile or null if not a vendor.
 */
export async function getVendorProfile(
  userId: string
): Promise<VendorProfile | null> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("vendor_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("[getVendorProfile] Error:", error);
      return null;
    }

    return data as VendorProfile | null;
  } catch (err) {
    console.error("[getVendorProfile] Unexpected error:", err);
    return null;
  }
}

/**
 * Check if user is admin or sub_admin.
 */
export async function isUserAdmin(): Promise<boolean> {
  const profile = await getCurrentUserProfile();
  if (!profile) return false;
  return profile.role === "admin" || profile.role === "sub_admin";
}

/**
 * Check if user is vendor.
 */
export async function isUserVendor(): Promise<boolean> {
  const profile = await getCurrentUserProfile();
  if (!profile) return false;
  return profile.role === "vendor";
}

/**
 * Check if user is buyer.
 */
export async function isUserBuyer(): Promise<boolean> {
  const profile = await getCurrentUserProfile();
  if (!profile) return false;
  return profile.role === "buyer";
}
