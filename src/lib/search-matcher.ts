import { createAdminClient } from "./supabase/admin";

interface SavedSearchEntry {
  id: string;
  buyer_id: string;
  query: string;
  filters: Record<string, string> | null;
}

/**
 * Check if text contains a search query (case-insensitive, partial match).
 */
function textMatchesQuery(text: string | null, query: string): boolean {
  if (!text) return false;
  const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const lowerText = text.toLowerCase();
  return searchTerms.some((term) => lowerText.includes(term));
}

/**
 * Match a newly approved/created vendor profile against all saved searches
 * with notify_on_match enabled. Creates notifications for any matches.
 * Fire-and-forget — never throws.
 */
export async function matchVendorAgainstSavedSearches(params: {
  vendorId: string;
  businessName: string;
  description: string | null;
  categoryId: string | null;
  city: string | null;
  state: string | null;
  slug: string;
}): Promise<void> {
  try {
    const adminClient = createAdminClient();

    // Fetch category name for matching against filters
    let categoryName: string | null = null;
    if (params.categoryId) {
      const { data: cat } = await adminClient
        .from("categories")
        .select("name")
        .eq("id", params.categoryId)
        .single();
      categoryName = (cat as { name: string } | null)?.name || null;
    }

    // Fetch all saved searches with notifications enabled
    const { data: searches } = await adminClient
      .from("saved_searches")
      .select("id, buyer_id, query, filters")
      .eq("notify_on_match", true);

    const savedSearches = (searches || []) as SavedSearchEntry[];

    for (const search of savedSearches) {
      const filters = search.filters || {};

      // Check query match against vendor fields
      const queryMatch =
        textMatchesQuery(params.businessName, search.query) ||
        textMatchesQuery(params.description, search.query) ||
        textMatchesQuery(params.city, search.query) ||
        textMatchesQuery(params.state, search.query) ||
        (categoryName && textMatchesQuery(categoryName, search.query));

      // Check category filter match
      const filterCategory = filters.category?.toLowerCase();
      const categoryMatch = !filterCategory ||
        textMatchesQuery(categoryName, filterCategory);

      if (queryMatch && categoryMatch) {
        // Create notification for the buyer
        await adminClient.from("notifications").insert({
          user_id: search.buyer_id,
          type: "saved_search_match",
          title: `🔍 New vendor match: ${params.businessName}`,
          body: `A new vendor matching "${search.query}" has been listed on DBMartNG.`,
          payload: {
            url: `/vendors/${params.slug}`,
            vendorId: params.vendorId,
            vendorName: params.businessName,
            vendorSlug: params.slug,
            savedSearchId: search.id,
            searchQuery: search.query,
          },
        } as never);
      }
    }
  } catch (err) {
    console.error("[SearchMatcher] Failed to match vendor:", err);
  }
}

/**
 * Match a newly approved listing against all saved searches.
 * Fire-and-forget — never throws.
 */
export async function matchListingAgainstSavedSearches(params: {
  listingId: string;
  title: string;
  description: string | null;
  categoryId: string | null;
  tags: string[];
  vendorName: string;
  vendorSlug: string;
}): Promise<void> {
  try {
    const adminClient = createAdminClient();

    // Fetch category name for matching against filters
    let categoryName: string | null = null;
    if (params.categoryId) {
      const { data: cat } = await adminClient
        .from("categories")
        .select("name")
        .eq("id", params.categoryId)
        .single();
      categoryName = (cat as { name: string } | null)?.name || null;
    }

    // Fetch all saved searches with notifications enabled
    const { data: searches } = await adminClient
      .from("saved_searches")
      .select("id, buyer_id, query, filters")
      .eq("notify_on_match", true);

    const savedSearches = (searches || []) as SavedSearchEntry[];

    for (const search of savedSearches) {
      const filters = search.filters || {};

      // Check query match against listing fields
      const queryMatch =
        textMatchesQuery(params.title, search.query) ||
        textMatchesQuery(params.description, search.query) ||
        params.tags.some((tag) => textMatchesQuery(tag, search.query));

      // Check category filter match
      const filterCategory = filters.category?.toLowerCase();
      const categoryMatch = !filterCategory ||
        textMatchesQuery(categoryName, filterCategory);

      if (queryMatch && categoryMatch) {
        // Create notification for the buyer
        await adminClient.from("notifications").insert({
          user_id: search.buyer_id,
          type: "saved_search_match",
          title: `🆕 New listing: ${params.title}`,
          body: `${params.vendorName} posted a new listing matching "${search.query}".`,
          payload: {
            url: `/vendors/${params.vendorSlug}`,
            listingId: params.listingId,
            listingTitle: params.title,
            vendorName: params.vendorName,
            vendorSlug: params.vendorSlug,
            savedSearchId: search.id,
            searchQuery: search.query,
          },
        } as never);
      }
    }
  } catch (err) {
    console.error("[SearchMatcher] Failed to match listing:", err);
  }
}
