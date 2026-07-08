/**
 * Shared permission definitions for sub-admin management.
 * Used by both the API route and the admin UI to stay in sync.
 */

export interface PermissionDef {
  key: string;
  label: string;
  description: string;
}

export interface PermissionCategory {
  category: string;
  permissions: PermissionDef[];
}

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    category: "Vendors",
    permissions: [
      { key: "vendors.view", label: "View Vendors", description: "See vendor profiles and applications" },
      { key: "vendors.approve", label: "Approve Vendors", description: "Approve vendor applications" },
      { key: "vendors.reject", label: "Reject Vendors", description: "Reject vendor applications" },
    ],
  },
  {
    category: "Listings",
    permissions: [
      { key: "listings.view", label: "View Listings", description: "See all listings" },
      { key: "listings.approve", label: "Approve Listings", description: "Approve pending listings" },
      { key: "listings.reject", label: "Reject Listings", description: "Reject listings" },
      { key: "listings.flag", label: "Flag Listings", description: "Flag and clear flags on listings" },
    ],
  },
  {
    category: "Badges",
    permissions: [
      { key: "badges.grant", label: "Grant Badges", description: "Grant verified badges" },
      { key: "badges.revoke", label: "Revoke Badges", description: "Revoke verified badges" },
    ],
  },
  {
    category: "Ads",
    permissions: [
      { key: "ads.view", label: "View Ads", description: "See ad requests" },
      { key: "ads.approve", label: "Approve Ads", description: "Approve ad requests" },
      { key: "ads.reject", label: "Reject Ads", description: "Reject ad requests" },
    ],
  },
  {
    category: "Reports",
    permissions: [
      { key: "reports.view", label: "View Reports", description: "See complaints and disputes" },
      { key: "reports.resolve", label: "Resolve Reports", description: "Resolve or dismiss complaints" },
    ],
  },
  {
    category: "Jobs",
    permissions: [
      { key: "jobs.view", label: "View Jobs", description: "See job applications" },
      { key: "jobs.review", label: "Review Jobs", description: "Review and respond to job applications" },
    ],
  },
  {
    category: "Analytics",
    permissions: [
      { key: "analytics.view", label: "View Analytics", description: "See platform analytics" },
    ],
  },
];

/** Flat list of all permission keys for easy validation */
export const ALL_PERMISSION_KEYS: string[] = PERMISSION_CATEGORIES.flatMap(
  (cat) => cat.permissions.map((p) => p.key)
);

/** Flat list of all permission defs with their labels */
export const ALL_PERMISSION_DEFS: PermissionDef[] = PERMISSION_CATEGORIES.flatMap(
  (cat) => cat.permissions
);
