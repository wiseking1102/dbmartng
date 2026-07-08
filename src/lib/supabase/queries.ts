/**
 * Type-safe query helpers for Supabase.
 *
 * These wrappers work around TypeScript's inability to resolve Supabase's complex
 * generic type chain, which frequently results in `never` types for query results.
 *
 * Usage (single row):
 *   const { data: profile } = await qx.single<{ role: string }>(
 *     adminClient.from("users").select("role").eq("id", user.id)
 *   );
 *
 * Usage (multiple rows):
 *   const { data: listings } = await qx.many<{ id: string; title: string }>(
 *     adminClient.from("listings").select("id, title")
 *   );
 *
 * Usage (insert/update):
 *   await qx.update(adminClient.from("table"), { field: "value" }).eq("id", id);
 */

import type { PostgrestFilterBuilder, PostgrestSingleResponse, PostgrestResponse } from "@supabase/supabase-js";

export const qx = {
  /**
   * Fetch a single row with proper typing.
   */
  async single<T>(query: any): Promise<{ data: T | null; error: any }> {
    const result = await (query as never) as unknown as PostgrestSingleResponse<T>;
    return { data: result.data ?? null, error: result.error };
  },

  /**
   * Fetch multiple rows with proper typing.
   */
  async many<T>(query: any): Promise<{ data: T[] | null; error: any }> {
    const result = await (query as never) as unknown as PostgrestResponse<T>;
    return { data: result.data ?? null, error: result.error };
  },

  /**
   * Update with proper typing.
   */
  update(table: any, values: Record<string, unknown>) {
    return table.update(values as never);
  },

  /**
   * Insert with proper typing.
   */
  insert(table: any, values: Record<string, unknown>) {
    return table.insert(values as never);
  },
};
