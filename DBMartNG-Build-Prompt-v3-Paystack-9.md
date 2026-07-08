# DBMartNG — Complete Build Prompt (v3, Paystack Edition)

Copy everything below into your AI coding agent (Gemini, Claude Code, etc.) to build the site end-to-end. This is the full merged spec: original scope + all v2 upgrades (brand, 3D/motion, SEO, engagement, reliability, security, accessibility) + **Paystack in place of Stripe** for payments/subscriptions, since Stripe does not support payouts to Nigerian bank accounts.

---

## ROLE & OBJECTIVE

You are building **DBMartNG**, a full-featured multivendor business directory and marketplace web platform. Build this as a complete, production-ready web application — not a demo or prototype. Ask clarifying questions only if something below is genuinely ambiguous; otherwise make sensible decisions and proceed.

**This prompt is a required baseline, not a ceiling.** You are not strictly bound to only what is written here. Where you judge that an improvement, a better UX pattern, an additional safety/quality feature, or a smarter architectural choice would genuinely benefit the platform, implement it — you do not need to ask permission first. The only constraint is that any addition must not contradict, weaken, or quietly remove anything explicitly required above (e.g. don't simplify away the admin allowlist flow, don't drop a required page, don't downgrade a security requirement to make something easier to build). When you do add something beyond this spec, briefly note what you added and why in the README or a CHANGES section, so it's easy to see what came from the prompt versus what came from your own judgment.

---

## 0. Brand Identity & Domain (locked)

- **Domain:** `dbmart.ng` — use this as the single source of truth for every canonical URL, `metadataBase`, sitemap, `robots.txt`, and OpenGraph URL in the codebase. Do not hardcode `dbmartng.com` or any other domain anywhere.
- **Logo:** The "DB" monogram shopping cart — a cart silhouette formed from the letters D and B, wheels as circles. Three approved treatments:
  - **Flat/line mark** (navy on white) — favicons, small UI instances, monochrome contexts, anything scaling down.
  - **Metallic/3D rendered mark** (navy-blue with rose-gold/bronze edges on marble background) — hero/brand asset: OG images, splash screens, loading states, About/Pricing brand moments.
  - **Layered/embossed print version** (navy and gold, deeper bevel) — print-style assets (PDF invoices, vendor certificates, email headers).
  - Logo assets will be provided as files under `/public/brand/` (SVG/PNG/GLB) — reference them directly; do not attempt to recreate them in code or hallucinate a substitute shape.
- **Color system:** Deep navy (`#0B3C7B`) as primary, gold/bronze (`#C9B037` or the warmer rose-gold from the metallic render) as accent/CTA color, neutral slate-gray for secondary UI. Every high-contrast CTA uses gold against navy or white — this is the definitive brand contrast pair.
- **3D hero concept:** Prioritize the "3D Logo Reveal" — extrude the DB cart mark into a subtle rotating/floating 3D object (matching the metallic render's navy/gold material) as the homepage hero centerpiece. Reuses real brand equity, lowest performance cost of the options considered.
- Favicon, app icons, PWA manifest icons, and social share previews derive from the flat line-mark logo (cleanest at small sizes); metallic version reserved for large hero/OG contexts.

---

## 1. PURPOSE

DBMartNG is a platform where businesses (vendors) create a public profile page and list their products/services for the world to see. Regular visitors (buyers) can browse, search, and discover businesses, then contact vendors directly to make a purchase — there is no in-site cart or checkout. Vendors get one month free, then must subscribe to keep their listing active. **Launch positioning: Nigeria-first, globally accessible** — the site is publicly reachable and usable by anyone anywhere (English, NGN pricing via Paystack), and the vendor base is Nigerian at launch, but the architecture must not hard-restrict the platform to one country. Full international expansion — additional languages, additional currencies, non-Paystack payment rails, and non-Nigerian vendor bases — is a deliberate later phase (Section 15), not a v1 promise; do not over-build multi-language/multi-currency UI now, but do keep data models and routing structured so that expansion doesn't require a rebuild later.

---

## 2. CORE FEATURES

### Buyer-facing
- Browse all vendors, filterable by category — both **goods categories** (fashion, food, tech/electronics, and other common product categories) and **service categories** (makeup artistry, photography/videography, tailoring/sewing, hair styling, event planning, tutoring/coaching, home/auto repair, and other common service categories) — the full list is extensible either way, but seed it with real examples from both types so the platform doesn't read as goods-only
- Search bar with keyword search across business names, product/service names, and categories, with typo correction, instant/incremental results, and **vendor-name autocomplete** — as a buyer types, matching vendor names surface as suggestions before they even submit the search, so someone looking for a specific business by name (not just browsing by category) can jump straight to that vendor's full profile
- Vendor public profile page: business info, verified badge (if approved), product/service listings, contact options, cover image, gallery, video support, store hours with a live **"Open Now" / "Closed"** indicator computed from those stored hours and the current time, embedded map, reviews & ratings, social links, website, WhatsApp/call/share buttons, QR code, animated verified badge, and a **seller responsiveness signal** ("Usually replies within 2 hours") computed from historical reply times in the `messages` table
- Sponsored listings/vendors and admin-created **company ads** appear inline within relevant search/category results (see Section 6.1) — visually tagged so buyers can distinguish paid placement from organic results
- Contact a vendor two ways: (a) direct contact info (email, phone, and a **WhatsApp deep link** — vendor enters their exact WhatsApp number during onboarding, and the site generates a `wa.me` link with a pre-typed message already filled in, so the buyer just taps send in their own WhatsApp app; no WhatsApp Business API integration needed), and (b) in-site messaging without leaving the platform, rate-limited per buyer-vendor pair to prevent spam/harassment (Section 13)
- Buyer account (signup/login) to save favorite vendors, manage sent messages, recently viewed, saved searches with notify-on-match, wishlist/favorites, referral program
- AI chatbot (Section 8) for help finding businesses and general site questions
- Optional live chat widget for human support
- Lightweight real-time activity toasts ("3 new vendors joined this week," "TechZone NG got a 5-star review") sourced from real Supabase realtime events — never fabricated in production
- **"Work With Us" access point** — a visible link/button in the hero or homepage nav, accessible without logging in, leading to a public job application page (see Section 7 and Section 3.2)

### Vendor-facing
- Vendor signup/login (separate role from buyer — see Section 3)
- Vendor onboarding flow: business name, logo, description, category, contact details, location
- **Optional share-to-social step (honor system, non-blocking):** near the end of onboarding, show the vendor a professionally pre-written caption (generated by the agent, referencing their business name and a link to their new DBMartNG profile) alongside "Share to WhatsApp Status," "Share to WhatsApp Group/Contact," and optionally TikTok/Snapchat share buttons that open each app with the caption and link pre-filled. This step is genuinely optional and cannot technically be enforced or verified server-side (no API confirms a status post happened) — present it as a helpful nudge with a simple "I've shared it" acknowledgment checkbox, and let the vendor continue onboarding immediately whether or not they use it. Do not block, delay, or gate account creation on this step in any way.
- Product/service listing management: add, edit, delete listings with images, price, description. Every new/edited listing enters `pending_review` status and is not publicly visible until approved (see Section 3.3 — Listing Verification)
- Full vendor dashboard including:
  - Analytics (profile views, listing views, click-throughs to contact, WhatsApp clicks, conversion funnel, top products)
  - Inbox for buyer messages
  - Promotions/featured listing management, flash sales, coupon codes
  - **Ad/sponsorship requests** — submit a paid campaign to promote a single listing, a bundle of listings, or the whole vendor account (see Section 6.1). Separate from subscription billing.
  - Subscription/billing status and management (Paystack)
  - Profile and listing editor
- **1-month full-access trial:** every vendor gets complete Pro-tier access automatically at signup, no card required upfront.
- **Trial-expiry decision screen:** on day 30, the vendor is shown an explicit choice — "Continue Free" (with the exact restrictions listed out, including the current admin-set free-tier listing limit) or "Continue Pro" (full feature list, live price pulled from `platform_settings`, straight into Paystack checkout). If the vendor takes no action, they default to Free tier on next login — never a hard suspension.
- **Two-tier model after trial:**
  - **Free tier:** listing count capped at whatever the superior admin has set in `platform_settings.free_tier_listing_limit` (not hardcoded), basic profile, no analytics, not eligible for ads/sponsorship.
  - **Pro tier (paid, monthly):** unlimited listings, full analytics, featured/promoted placement eligibility, in-site messaging inbox, tiered visibility boosts.
  - Price changes made later by admin apply only to new subscriptions by default; existing subscribers are grandfathered at their signed-up price unless the admin explicitly toggles "apply to existing subscribers" for a specific repricing campaign.
- **All Paystack payment channels enabled** — `card`, `bank`, `bank_transfer`, `ussd`, `mobile_money` (this is the channel that covers OPay, PalmPay, Kuda, and similar Nigerian wallet apps — they are not separate integrations, just enabled automatically when `mobile_money` is included), `qr`, and `apple_pay`. Pass the full channel array explicitly when initializing transactions/checkout rather than relying on dashboard defaults, so no channel is silently narrowed to card-only.
- **Vendor verification at launch:** basic profile info plus phone number OTP verification only (no CAC registration or ID upload required at this stage) — admin/sub-admin still makes the final manual approval call on top of the verified phone. Stricter KYC (CAC number, ID upload) is a documented future upgrade (Section 15), not required for v1.
- **Vendor referral program:** vendors get a unique referral link/code; when a referred vendor completes their trial and subscribes to Pro, the referring vendor earns a reward (e.g. one free month), tracked in a `referrals` table.
- **Vendor data export:** vendors can export their own listings and analytics data (CSV) from the dashboard at any time.
- **Automated basic image AND text moderation** on listing photo uploads and listing descriptions (block obviously inappropriate images and filter profanity/spam patterns in text before content goes to `pending_review`) — this runs before, not instead of, human listing verification (Section 3.3). Apply the same text moderation filter to in-site messages (Section 2) to catch spam/abusive content in buyer-vendor conversations.
- **Duplicate vendor account detection at signup/onboarding:** flag (not necessarily auto-block) new vendor applications that match an existing vendor on phone number, Paystack customer/bank account reference, or device fingerprint — surfaced to the admin/sub-admin reviewing the application rather than silently rejected, since legitimate reasons for a match can exist (e.g. one person running two distinct businesses). This is aimed at catching people re-registering to dodge the free-tier listing cap or a prior rejection, not blocking all repeat use of the same phone/device.
- Vendors must be manually verified/approved by an admin (or a sub-admin with that permission) before their profile goes live and before they receive a "Verified" badge

### Admin-facing (superior admin — full detail in Section 3.1 and 3.2)
- Admin panel accessible to exactly two equal superior-admin accounts, both with full permissions (no hierarchy between them)
- Approve or reject new vendor applications, with any duplicate-account signals (matching phone, Paystack reference, or device fingerprint) surfaced directly in the application review view
- Grant/revoke the "Verified" badge
- **Review and verify/reject individual listings** for legitimacy (accurate description, plausible pricing, no prohibited items, matches vendor's declared category); vendor-declared stock status is trusted but spot-checked, not independently verified
- **Create and manage sub-admin accounts**, assigning a granular permission set per sub-admin (Section 3.2)
- **Review job applications** submitted via the public "Work With Us" page, as the entry point into onboarding a new sub-admin
- **Approve/reject vendor ad and sponsorship requests**, and pin approved sponsored content to the top of matching keyword/category search results for the admin-set duration (Section 6.1)
- **Create company/house ads** directly (no approval queue needed since the admin is the creator), scheduled with a start/end duration, shown on both vendor-facing and buyer-facing pages
- **Control platform-wide pricing** via `platform_settings` — subscription price, ad/sponsorship pricing, free-tier listing limit, sponsored-slot mode (limited/unlimited) and count — all editable live, with the public Pricing page (Section 7) reading from this same source instead of hardcoded copy
- View and manage all vendors, listings, and buyer accounts
- View and manage subscription status across all vendors
- Basic platform-wide analytics (total vendors, active subscriptions, total listings, ad revenue, etc.)
- Spam/fraud detection with an admin approval workflow for new listings and a "report business/listing" flow for users

### Nice-to-have (build if time allows, otherwise stub cleanly)
- Featured/promoted vendor carousel on the homepage
- Voice and image search (stretch goals)
- Sold aggregate/anonymized market-insight reports as a premium add-on (Section 6.1)
- Paid buyer tier (ad-free browsing, priority messaging) as a second monetizable audience

---

## 2.1 NOTIFICATIONS (all roles)

Build a unified `notifications` table (`id`, `user_id`, `type`, `payload` (jsonb), `read_at`, `created_at`) with Supabase Realtime subscriptions powering an in-app notification bell that updates live without polling. Pair every notification type with a transactional email (via Resend or similar), triggered from the same underlying database event or Paystack webhook — not a bolted-on separate system. Let buyers/vendors toggle non-critical email notifications off in account settings; keep billing-critical ones (trial ending, subscription failed) non-optional.

**Admin notifications:**
- New vendor application submitted (needs approval), flagged with any duplicate-account signals detected
- New listing submitted (needs verification)
- New "report business/listing" flagged
- Subscription payment failures across the platform
- New job application submitted via "Work With Us"
- New vendor ad/sponsorship request submitted (needs approval)
- Multiple failed login/OTP attempts on an admin identifier (security signal)
- Weekly digest: new vendors, new listings, messages sent, trial→paid conversion rate, ad revenue

**Sub-admin notifications:** the same items above, filtered to only what their granted permissions cover (e.g. a sub-admin with only `verify_listings` gets new-listing alerts, not subscription-failure alerts).

**Vendor notifications:**
- New buyer message received
- Listing approved / rejected (with reason) by admin or sub-admin
- Trial ending soon (e.g. 3 days before) and the trial-expiry decision screen becoming active
- Subscription payment successful / failed / about to renew
- Ad/sponsorship request approved, rejected, or expiring soon
- Verified badge granted or revoked
- Buyer favorited their profile; listing view traffic spikes
- Someone left a review/rating
- Inactivity nudge ("You haven't added a listing in 2 weeks")
- Payment method expiring soon (card on file with Paystack)

**Buyer notifications:**
- Vendor replied to their message
- Saved-search match found
- Favorited vendor posted a new listing or promotion, or a price drop
- Welcome/onboarding tips after signup
- Referral reward earned

---

## 2.2 SYSTEM HEALTH & INTEGRATION ALERTS (ops layer, distinct from user notifications)

This is a technical alert channel for the superior admins (as platform operators), not a user-facing notification — it fires when something breaks so it can be fixed before customers notice.

**Triggers:**
- Gemini API request fails or times out repeatedly (e.g. 3+ failures in 5 minutes)
- Paystack webhook fails signature verification or returns an error
- Supabase database connection errors or RLS policy failures
- Live chat widget fails to load
- Any 5xx on the homepage or a vendor profile page (ties into the uptime monitoring in Section 11)
- Email delivery provider failures
- Display-ad network (Section 6.1) fails to load or serve

**Delivery:**
- Log every incident to a `system_alerts` table (`id`, `source`, `error_detail`, `severity`, `occurred_at`, `resolved_at`).
- Push alerts in real time to a channel the admins will actually see fast — email to both admin identifiers, plus a webhook into Slack/Discord/Telegram if configured.
- Rate-limit the alerts themselves — batch into a "still down" reminder every ~30 minutes rather than alerting on every single failure.
- Each alert includes: what failed, when, how many times, and a direct link to the relevant Vercel/Supabase logs.

---

## 3. AUTHENTICATION & USER ROLES

Four distinct roles with separate permissions:
1. **Buyer** — browse, search, message vendors, save favorites
2. **Vendor** — manage own profile, listings, dashboard, subscription
3. **VIP Vendor** — a superior-admin-invited vendor tier with elevated privileges (Section 3.5)
4. **Admin** — two equal accounts, full platform control

The login/signup screen must let the user choose Vendor or Buyer/Customer, with clearly separate flows and dashboards after login, and **different login methods per role**:

- **Buyers:** "Continue with Google" or email/password only. No phone number or OTP step anywhere in the buyer signup or login flow — just email, create password, done. Keep this path as short as possible; buyers should never see an OTP screen.
- **Vendors:** "Continue with Google," email/password, **or "Continue with Phone" (OTP-based login)** — all three are equally valid, repeatable login methods, not just a one-time verification step. Additionally, every vendor completes a one-time phone OTP identity verification during onboarding (Section 2) regardless of which login method they choose going forward — that verification step is separate from and in addition to the phone+OTP *login* option.

The login-method distinction is intentional: buyers should have the lowest-friction signup possible since browsing/contacting vendors is low-stakes, while vendors — who go through subscription billing, listing ownership, and the admin-allowlist-adjacent trust model — get a more identity-anchored set of options.

**Session persistence (all roles):** closing the browser tab or refreshing the page must never log a user out — buyer, vendor, or admin. Sessions persist (via Supabase's session/token storage) until the user takes an explicit "Log out" action. Do not implement any auto-expiring session tied to tab closure or refresh.

Security baseline: rate limiting, CSRF/XSS protection, SQL-injection prevention, Row Level Security in Supabase, CAPTCHA on public forms, secure auth, audit logs.

---

## 3.1 Admin Access — Hidden Allowlist Flow (no visible "Admin" role anywhere)

There is no "Admin" option on the public login/signup screen — ever. The Vendor/Buyer selector is all a visitor ever sees. Admin access is entirely driven by a pre-approved allowlist of exactly two identifiers (email or phone), checked silently on the backend. Build this exact flow:

**Data model addition:**
- `admin_allowlist` table: `id`, `identifier` (email or phone), `identifier_type` (`email` | `phone`), `claimed` (boolean, default `false`), `linked_user_id` (nullable, set once claimed), `created_at`.
- Seed this table manually with exactly two rows (the two approved admin identifiers) after deploy — never expose a way to add rows to this table through any public-facing UI or API route.

**Step-by-step flow:**
1. Visitor enters an email or phone number on the normal login/continue screen (same screen used by everyone, whether they came in via a "Vendor" or "Buyer" tab).
2. Server-side check: does this identifier exist as a row in `admin_allowlist`?
   - **No match** → proceed with the completely normal buyer/vendor login or signup flow. No indication that an admin path exists.
   - **Match found** → the UI changes to indicate admin access was detected, and branches on the `claimed` flag:

3a. **`claimed = true` (admin account already set up):**
   - Show a password field. On correct password, check `platform_settings.admin_2fa_required` (boolean, default `true`, toggleable by a superior admin in the admin panel):
     - If **enabled** — do not grant access yet; send a one-time code to that same email or phone and require it before the session is elevated and redirected to `/admin`.
     - If **disabled** — grant access and redirect to `/admin` immediately after the correct password, skipping the OTP step.
   - This toggle applies platform-wide to all superior-admin logins (not configurable per-admin); a superior admin can flip it back on at any time from the admin panel. Recommended default is enabled, given admin accounts control pricing, payouts-adjacent settings, and moderation — but the choice is explicitly the superior admin's to make.
   - Once logged in, the admin session persists across tab close/refresh like any other role (Section 3) — the OTP setting only governs the login event itself, not ongoing session behavior.

3b. **`claimed = false` (first time this identifier is used):**
   - Show an "Admin Account Setup" form: name, create password, confirm password.
   - Before finalizing account creation, send an OTP to that email/phone and require it to be entered correctly — this proves the person actually controls the identifier, not just knows it, and prevents someone from racing to claim an admin slot they don't own. This one-time ownership-verification OTP always happens at account creation, regardless of the `admin_2fa_required` login setting.
   - On successful OTP verification: create the `users` row with `role = admin`, set `admin_allowlist.claimed = true` and `linked_user_id` for that row, then log the new admin in.

4. **One identifier, one claim, permanently.** Once a row in `admin_allowlist` is claimed, it can never be used to create a second admin account. Since there are exactly two rows, this hard-caps the platform at two admins with no code path that allows a third.

5. **Enforce this server-side only.** The allowlist check, OTP verification, and role elevation must all happen in server components/middleware/API routes — never exposed to or checkable from client-side JavaScript, so the existence of the admin path can't be discovered by inspecting the frontend bundle.

6. **Audit logging:** every admin login (success and failed OTP attempts, and whether OTP was required for that login per the current setting), every vendor approval/rejection, every verified-badge grant/revoke, and every change to `admin_2fa_required` must be written to an `admin_audit_log` table (`admin_user_id`, `action`, `target_id`, `timestamp`) so that with two equal admins, every action is still individually attributable.

7. **Multi-device login is allowed by design, with visibility and control.** An admin identifier can be logged in on multiple devices simultaneously (e.g. phone and laptop at once) — each login creates its own independent session, and logging out on one device never affects another. To keep this safe rather than opaque:
   - **Active Sessions panel** in the admin's account settings: lists every currently-active session (device/browser type, approximate location from IP, last-active timestamp), each with its own "Log out this device" button.
   - **"Log out of all other devices"** one-click action, for when an admin isn't sure which specific session to revoke but wants to be safe.
   - **New-device login notification:** every time an admin identifier logs in from a device/browser/location combination not seen before, fire a notification (Section 2.1) — "New admin login detected from [device], [approximate location], [time]. Wasn't you? Revoke this session immediately," linking straight to the Active Sessions panel. This is the cheapest, highest-value defense against a compromised admin account being used quietly without the real admin noticing.

---

## 3.2 Sub-Admin System & Permissions

Superior admins remain structurally superior to every sub-admin at all times. Sub-admins are real employees brought on over time (unlike the fixed 2-slot superior admin cap) to handle day-to-day moderation.

**Onboarding path:** the normal entry point is the public "Work With Us" application page (Section 2, Section 7). A superior admin reviews submitted applications in an Applications queue and, when they want to bring someone on, triggers a sub-admin invite to that person's email. The invited person sets their own password on first login and must complete an OTP-verification-of-ownership step (same principle as Section 3.1's admin setup flow) before their sub-admin account is active.

**Data model:**
- `sub_admins` table: `id`, `user_id`, `invited_by` (superior admin's user id), `status` (`invited` / `active` / `revoked`), `created_at`.
- `sub_admin_permissions` table: `sub_admin_id`, `permission_key`, `granted` (boolean) — a row per permission toggle, editable anytime by a superior admin.

**Available permission toggles (set individually per sub-admin by a superior admin):**
- `verify_listings` (default on — this is the core sub-admin job: confirm listings look legitimate, description/pricing are plausible, no prohibited items)
- `verify_vendors` (approve/reject new vendor applications)
- `manage_verified_badge` (grant/revoke the "Verified" badge)
- `handle_reports` (spam/fraud report queue)
- `approve_ads` (review vendor ad/sponsorship requests — Section 6.1)
- `view_analytics` (read-only platform stats, no edit rights)

**Permanently excluded from sub-admins, regardless of permission settings** (superior-admin-only, no toggle exists for these): creating or managing other sub-admin accounts, creating or managing superior admin accounts, subscription/billing data, `platform_settings` pricing controls, reviewing "Work With Us" job applications, company/house ad creation.

Every sub-admin action is written to the same `admin_audit_log` table as superior admins, tagged with their specific `user_id`, so all moderation activity remains individually attributable regardless of who performed it.

---

## 3.3 Listing Verification & Moderation Workflow

Every listing carries an explicit status, not just a blanket vendor-verified badge:
- `pending_review` — newly added or edited listing; not visible to buyers yet.
- `approved` — live and visible.
- `rejected` — hidden, vendor notified with a reason (via notification, Section 2.1), must edit and resubmit.
- `flagged` — was live, then reported or spot-checked; temporarily hidden pending re-review.

**Who can review:** superior admins always; sub-admins only if granted `verify_listings`. A reviewer checks: does the listing look legitimate, is the description/price plausible, does it match the vendor's declared category, no prohibited items. Stock status is vendor-declared and trusted — reviewers spot-check for obviously stale or fake listings rather than independently verifying physical inventory, since that isn't something a reviewer can confirm remotely.

Add `status`, `status_reason`, `reviewed_by` (nullable, references either a superior admin or sub-admin user id), and `reviewed_at` fields to the `listings` table (Section 9). Every status change fires a notification to the vendor and an audit log entry.

---

## 3.4 Reviews, Ratings & Disputes

**Eligibility to review:** only buyers who have actually contacted/messaged a vendor through the in-site messaging system (Section 2) are permitted to leave a review and rating on that vendor's profile — this is enforced server-side by checking for an existing `messages` record between that buyer and vendor before allowing a review submission. This prevents anonymous or drive-by reviews with no real interaction behind them.

**Vendor response:** a vendor may post exactly one public reply per review, visible beneath it on their profile. No further back-and-forth thread — if a vendor disputes a review's fairness, their recourse is the "report business/listing"-style flow (routed to `handle_reports`) rather than an open reply chain, keeping review sections readable and preventing arguments from playing out publicly.

**Moderation:** superior admins always, sub-admins with `handle_reports` granted, can remove reviews that are abusive, fake, or violate content guidelines — logged in `admin_audit_log` like any other moderation action.

**Off-platform disputes (buyer paid a vendor directly and didn't receive what was promised):** DBMartNG has no in-site checkout, so it cannot reverse or refund a transaction that happened off-platform. Its role is **light mediation, not arbitration**:
- Buyers can file a complaint against a vendor through the "report business/listing" flow, specifying the nature of the dispute.
- Complaints accumulate against a vendor's record (`vendor_profiles` gets a `complaint_count` or a linked `vendor_complaints` table).
- A superior admin (or a sub-admin with `handle_reports`) can flag, formally warn, or suspend a vendor's listing/account if complaints repeat or a pattern of legitimate-looking fraud emerges.
- This entire policy — that DBMartNG facilitates discovery and contact but is not a party to or guarantor of any transaction — must be stated plainly in the Terms of Service (Section 7).

**Data model additions:** `reviews` (`id`, `buyer_id`, `vendor_id`, `rating`, `body`, `vendor_reply`, `created_at` — insert blocked unless a prior `messages` row exists for that buyer/vendor pair), `vendor_complaints` (`id`, `vendor_id`, `buyer_id`, `reason`, `status`, `created_at`, `resolved_by`).

---

## 3.5 VIP Vendors

A fourth vendor tier, sitting above Pro, that exists purely by superior-admin invitation — it is never self-selected, never purchasable, and never granted by a sub-admin.

**Invitation mechanic:** a superior admin invites a prospective VIP vendor by email or phone number (same principle as the sub-admin invite flow in Section 3.2 — the invited person claims the account via an OTP-verified setup step proving they control that identifier). There is no public application path for VIP status; it is admin-initiated only.

**VIP Vendor perks (all granted together, not individually toggleable):**
- **No trial, no billing, ever** — full Pro-level feature access permanently, with no Paystack subscription attached at all. A VIP vendor cannot be downgraded by a failed payment because there is no payment to fail.
- **Guaranteed permanent sponsored placement** — sits outside the normal admin-controlled sponsored-slot limited/unlimited system (Section 6.1) entirely; a VIP vendor's visibility boost is not subject to slot caps or rotation.
- **Automatically Verified** — skips the standard manual vendor-approval queue; a VIP vendor is trusted by default upon claiming their invitation.
- **Listings skip the normal verification queue** — a VIP vendor's listings publish directly to `approved` status rather than entering `pending_review`, though they remain subject to the same automated image/text moderation (Section 2) and can still be `flagged` after the fact if a genuine problem is reported.
- **Direct line to admin support** — VIP vendor reports/questions route straight to a superior admin, bypassing the standard sub-admin `handle_reports` queue.
- **A distinct VIP badge**, visually separate from the standard "Verified" checkmark badge, displayed on their public profile alongside (not instead of) the Verified badge.

**Data model additions:** add `is_vip` (boolean) and `vip_invited_by` (references the inviting superior admin's user id) to `vendor_profiles`. A `vip_invitations` table (`identifier`, `identifier_type`, `invited_by`, `claimed`, `linked_user_id`, `created_at`) mirrors the claim mechanic used for sub-admins and the core admin allowlist, keeping the "prove you control the identifier before the privileged status activates" pattern consistent across all three invite-based account types in this platform.

---

**Overall mood:** Clean, minimal, and trust-focused — this platform needs to feel credible and safe for both vendors and buyers, since real money and real contact info are involved.

**Visual style:**
- Minimal layouts with generous whitespace
- Glassmorphism-style cards for vendor/product listings (frosted-glass translucent panels, subtle blur, soft shadow) used tastefully — not overused
- Verified badges: clean checkmark badge (icon + label), animated, shown prominently on verified vendor profiles and listing cards
- High-contrast CTA buttons ("Contact Vendor," "Subscribe," "Message") using the gold accent against navy or white
- Rounded corners and soft, filleted edges throughout, consistent with the logo's rounded geometry
- Small delight details that reinforce "premium" without cost: soft shadows, micro-interactions, button ripple/magnetic effects, animated icons, a confetti burst on successful vendor registration, elegant skeleton loaders instead of spinners

**Typography:** a clean, modern sans-serif (Inter, Manrope, or similar) — confident but not corporate-stiff.

**Responsiveness:** Mobile-first. Must work well on phones, tablets, and desktops — it will later become the base for a native app. Bottom navigation, pull-to-refresh, swipe gestures on mobile.

---

## 5. MOTION & 3D DESIGN LAYER

Layer these libraries by role — do not use one library for everything:

| Library | Role | Notes |
|---|---|---|
| **Lenis** (`lenis/react`) | Global smooth-scroll (inertia/momentum) | Install once in root layout. ~3KB. Use `lerp: 0.1`, `syncTouch: true` (the old `smoothTouch` option and `@studio-freight/react-lenis` package are retired — use the `lenis/react` subpath). |
| **GSAP + ScrollTrigger** | Hero entrance sequences, pinned scroll reveals, staged text animation | Use on Home, Vendor/Business Profile, Pricing. Combine with `@gsap/react`'s `useGSAP` hook for clean unmount behavior. |
| **Motion (Framer Motion)** | Component-level UI animation | Modals, dashboard drawers, page transitions, dropdown menus — anything that mounts/unmounts. |
| **React Three Fiber + Drei** | 3D only | Reserved exclusively for the homepage hero's DB-monogram 3D element. Do not use WebGL anywhere else (Browse, Dashboard, Admin). |

**Homepage hero — 3D treatment:**
- Build the rotating DB-cart 3D object with React Three Fiber. Sync to scroll via Lenis + GSAP ScrollTrigger so it parallaxes/fades as the user scrolls into featured-vendors, then unmounts — never leave WebGL running off-screen.
- Use `useFrame` for animation (never `useEffect`), mutate Three.js objects via refs (never `setState` in the render loop), memoize geometries/materials with `useMemo`, use Drei's `<Preload all />` to avoid texture pop-in.
- Cap pixel ratio with `dpr={[1, 1.5]}` — cuts GPU load ~50% on high-DPI screens.
- Lazy-load the Canvas with `next/dynamic` (`ssr: false`) and a static fallback (`loading: () => <div className="hero-bg-fallback" />`) so it never blocks First Contentful Paint or delays the search bar becoming interactive.
- Detect `prefers-reduced-motion` and low-end/data-saver devices; fall back to a static gradient or the flat-line logo SVG.
- If using a real `.glb` model instead of procedural geometry, compress with Draco/Meshopt.
- Keep `r3f-perf` open in dev to catch draw-call creep early.

**Everywhere else** (Browse, listings, dashboards): glassmorphism card hover-lift, staggered fade-in on listing grids, smooth page transitions between Browse → Business Profile. GSAP/Motion only — no 3D. Motion should never slow down someone trying to contact a vendor; this is a marketplace, not a portfolio site.

---

## 6. TECH STACK

- **Frontend/Framework:** Next.js (React) with TypeScript
- **Styling:** Tailwind CSS
- **Backend/Database/Auth:** Supabase (Postgres, built-in role-based auth for Buyer/Vendor/Admin). Use Supabase strictly for structured data (all tables in Section 9) and auth — not for file storage.
- **File Storage: Cloudflare R2** (not Supabase Storage). All vendor logos, listing photos, galleries, company ad banners, and any other uploaded media are stored in Cloudflare R2 via its S3-compatible API, not in Supabase Storage. Reasoning (keep this decision, don't revert to Supabase Storage even though Supabase supports it natively): R2's free tier gives 10 GB storage (10x Supabase's free 1 GB) and, critically, **R2 has zero egress/bandwidth fees on any tier**, which keeps image-heavy buyer traffic from ever touching Supabase's free-tier 5 GB/month egress cap — this single decision is what keeps the platform viable on free-tier infrastructure through early growth. Only the resulting R2 URL is stored in the relevant Supabase row (e.g. `listings.image_url`, `vendor_profiles.logo_url`) — never the binary file itself.
- **Payments/Subscriptions: Paystack** (not Stripe — Stripe does not support payouts to Nigerian bank accounts; Paystack is Nigerian-native, supports NGN, cards, bank transfer, USSD, and is owned by Stripe, so the underlying rails are the same company). Use Paystack's **Plans + Subscriptions API** for the vendor subscription model, including trial period logic (1 month free) and automatic billing after trial ends. Use Paystack webhooks (`charge.success`, `subscription.create`, `subscription.disable`, `invoice.payment_failed`) to keep `vendor_profiles.subscription_status` in sync.
- **AI Chatbot:** Google Gemini API for the in-site AI chatbot (Section 8)
- **Display advertising:** Google AdSense or similar network for passive, traffic-driven revenue on public pages (Section 6.1)
- **Deployment:** Vercel, on the `dbmart.ng` domain — add `dbmart.ng` and `www.dbmart.ng` in Vercel → Settings → Domains once DNS (A record to `76.76.21.21`, CNAME `www` to `cname.vercel-dns.com`) has propagated.

Structure the codebase cleanly (`/app`, `/components`, `/lib`, `/types`) so it is easy to extend into a mobile app later (decouple business logic and data-fetching from UI where practical).

---

## 6.1 Ads & Monetization System

Three distinct, separately-tracked revenue streams — none of them share billing logic with the core Pro subscription.

**A. Vendor-purchased ads/sponsorship (separate from subscription billing):**
- Vendors can request to promote a single listing, a bundle of listings, or their entire vendor account.
- Available to vendors on any tier, including Free — a free-tier vendor can still pay for an ad on their one listing. This is a meaningful upsell path distinct from the subscription funnel.
- Request goes into an Ad Requests queue, reviewable by a superior admin or a sub-admin with `approve_ads` granted.
- On approval, the sponsored item is visually tagged "Sponsored" and pinned to the top of **matching keyword/category search results** for the approved duration — not dumped indiscriminately at the top of every page. A sponsored fashion listing surfaces at the top when someone searches or filters for fashion-related terms, keeping placement contextually relevant rather than spammy.
- Billed via Paystack as a separate one-off or recurring charge from the subscription plan, at whatever price the superior admin has set in `platform_settings`.

**B. Sponsored slot control (superior-admin-only):**
- The superior admin decides, at any time, whether sponsored slots are `limited` or `unlimited`, and if limited, the exact count (e.g. 3 per category) — stored in `platform_settings` (`sponsored_slots_mode`, `sponsored_slots_count`), editable live, not hardcoded.
- Sub-admins never touch this setting, consistent with pricing/settings staying superior-admin-only.

**C. Admin-created company/house ads:**
- Superior admins create these directly — title, image/banner, destination link, and a start/end duration — with no approval queue needed since the admin is the creator.
- These display across both vendor-facing and buyer-facing pages for the scheduled duration (platform announcements, seasonal promotions, "refer a vendor" campaigns) and expire automatically when the duration ends.

**D. Admin-controlled platform pricing:**
- A pricing control panel (superior-admin-only) to set/edit: Pro subscription price, ad/sponsorship campaign pricing, free-tier listing limit. Changes must sync to the actual Paystack Plan via their API, not just update a display number.
- Existing subscribers are grandfathered at their original signed-up price by default when the admin changes pricing; a toggle lets the admin explicitly apply new pricing to existing subscribers for a specific repricing campaign.
- The public Pricing page (Section 7) and all pricing-related JSON-LD/FAQ copy read live from `platform_settings` — never hardcoded.

**E. Passive/site-wide revenue (uptime-driven, not vendor-dependent):**
- **Display advertising** (e.g. Google AdSense or a similar network) on public-facing pages — Browse, category pages, Business Profile — generating revenue proportional to traffic with minimal ongoing effort. Wrap the ad network script in an error boundary (Section 2.2) so a failed ad load never breaks the surrounding page.
- Documented as future options in Section 15 rather than built now: affiliate/referral placements for vendor-relevant business tools, sold aggregate/anonymized market-insight reports, and a paid buyer tier (ad-free browsing, priority messaging).

**F. Admin-editable platform email addresses:**
- The superior admin panel includes a settings screen to input, edit, or remove the transactional "from" email addresses used platform-wide (e.g. `no-reply@dbmart.ng` for automated notifications, `support@dbmart.ng` for the contact form and support-facing replies) — stored in `platform_settings`, not hardcoded in the codebase, so these can be changed without a redeploy.
- All transactional email sending (Section 2.1 notifications, contact form auto-replies, Paystack receipt-adjacent emails) reads the current "from" address from this setting.

**Data model additions for this section** (see also Section 9): `ad_requests` (vendor-purchased campaigns — target type: listing/bundle/account, status, duration, price paid), `company_ads` (admin-created house ads — title, banner, link, start/end), `platform_settings` (single-row or key-value table holding all admin-editable pricing, slot-control, and transactional-email values, plus `admin_2fa_required`).

---

## 6.2 Paystack Payment Reliability, Reconciliation & Disputes

Webhooks are the single point where subscription status can drift from reality — this section exists because a missed or mishandled webhook event is the most likely way a vendor ends up incorrectly marked active/Pro after a failed or disputed payment. Build all of the following, not just the happy-path webhook handlers already listed in Section 6:

**Idempotency:** every incoming Paystack webhook event carries an event ID. Store processed event IDs (a `processed_webhook_events` table: `event_id`, `event_type`, `processed_at`) and check against it before acting — Paystack can and does resend the same webhook, and processing it twice must never double-charge, double-notify, or double-flip a status.

**Reconciliation job:** in addition to reacting to webhooks as they arrive, run a scheduled job (daily) that directly queries Paystack's API for each active vendor's actual subscription status and compares it against `vendor_profiles.subscription_status` in the database. Any mismatch (e.g. Paystack says cancelled/failed but the local record still says active) gets corrected automatically and logged to `system_alerts` (Section 2.2) — this is the safety net for webhooks that never arrived at all, not just ones that arrived and were mishandled.

**Failed payment handling:** on `invoice.payment_failed`, do not immediately downgrade the vendor — Paystack typically retries failed charges automatically over a short window. Instead, mark the vendor `payment_failed` (visually flagged in their dashboard, notification sent per Section 2.1) and only downgrade to Free tier if the retry window closes without a successful charge. Document the exact retry window used in the README.

**Chargebacks/disputes on vendor ad or subscription charges:** since disputes on Paystack-processed charges (ads, subscriptions — not off-platform vendor-to-buyer transactions, which are covered separately in Section 3.4) resolve asynchronously, treat any dispute-related webhook event the same as a failed payment: flag the vendor's account, notify the relevant admin, and do not restore full Pro access until the dispute resolves in the vendor's favor per Paystack's own resolution.

**Manual override:** superior admins (not sub-admins) must have a manual "force re-sync this vendor's subscription status from Paystack" action in the admin panel, for the rare case where automated reconciliation isn't enough and a human needs to intervene directly.

---

## 6.3 No-Code Admin Configuration & Safety Layer

The goal of this section: after launch, the superior admins should be able to make the vast majority of ongoing changes — site copy, pricing, credentials, provider swaps — entirely through the admin panel, without touching the coding agent, a CLI, or a redeploy. But every no-code edit path must ship with real safeguards, since a plain text-field-and-Save-button is how a typo becomes a live incident.

**A. Editable site content, not hardcoded**
- Store all editable site text (headlines, page copy, FAQ answers, empty states, etc.) in a `site_content` table (`key`, `value`, `updated_at`) rather than hardcoding it into components. Keys should be human-readable and namespaced (e.g. `home.hero.headline`, `pricing.faq.q1`).
- Build a **Content Editor screen** in the admin panel: every editable key listed with its current value in a text field, searchable/filterable so a specific piece of copy can be found quickly rather than scrolled through.

**B. Editable credentials, not baked into env vars alone**
- Store third-party API credentials (Gemini API key, Paystack secret key, SMS/OTP provider key, email provider key, display-ad network key) in a database-backed settings table, read at request time — not solely in build-time environment variables. This means rotating a burnt key or swapping to a replacement account is a paste-and-save in the admin panel, not a redeploy.
- Build a **Provider Adapter pattern** for anything genuinely swappable end-to-end (SMS/OTP provider, email provider): the application code always calls a generic internal function (`sendSMS()`, `sendEmail()`), and which real provider that function calls is selected from a dropdown in the admin panel among the adapters actually built. This only covers providers deliberately built as options in advance — swapping to a totally new, never-integrated provider still requires code, but rotating between planned alternatives (e.g. Termii ↔ a backup SMS provider) does not.

**C. Safety layer — required on every no-code edit path above, no exceptions**
1. **Version history + one-click revert:** every change to `site_content`, `platform_settings`, or stored credentials keeps the previous value, not just the new one. Each field shows "Last changed: [old] → [new], on [date] — Revert," so a mistake is a two-second undo, not a support ticket.
2. **Draft → Preview → Publish:** edits save as a draft first, viewable via a "Preview" action showing exactly how the change will look/behave live, before a separate "Publish" action actually pushes it. Saving is never instantly live.
3. **Confirmation modal with plain-English impact summary for high-impact fields** (site name/branding, domain-facing settings, subscription/ad pricing): before confirming, show exactly what's changing and where it appears (e.g. "This changes the site name from 'DBMartNG' to '[new value]' — it appears on the homepage, every page title, and the footer. Confirm?").
4. **Two-superior-admin confirmation for the most destructive settings** (site name/branding, disabling `admin_2fa_required`, major pricing changes, anything domain-facing): one superior admin proposes the change, it stays pending until the second superior admin approves it — a single admin, even if their account were compromised, cannot push these specific changes through alone.
5. **Full audit trail:** every change above — reverted or not — is written to `admin_audit_log` with both the old and new value, who made it, and when, consistent with the audit logging already required in Section 3.1.

**What remains code-only, and always will:** new features, structural or layout changes beyond what's theme-able, integrations with no adapter built for them yet, and actual bug fixes. This section removes the need to touch code for *changes*, not for *building new things* — be explicit about that distinction in the README so it's not mistaken for a promise the platform can rebuild itself.

---

## 7. PAGES / STRUCTURE

1. **Home** — 3D hero, live business counter, search bar, featured/trending/newly-joined/top-rated vendor rails, categories, testimonials, FAQ, partners strip, newsletter capture, AI-assistant preview, clear CTA for vendors to join, visible "Work With Us" link
2. **Browse/Categories** — full directory of vendors, filterable by category, with search, sponsored listings/company ads shown inline where relevant
3. **Business Profile** (public, per vendor) — vendor info, verified badge, listings, contact options, message form, gallery/video, map, reviews
4. **Login/Signup** — role selector (Vendor or Buyer/Customer), email/password + Google OAuth. No visible admin option (Section 3.1).
5. **Vendor Dashboard** (private) — profile editor, listings manager (with per-listing verification status), analytics, messages inbox, promotions, ad/sponsorship requests, subscription/billing management (Paystack)
6. **Buyer Account** (private) — saved/favorite vendors, sent messages, saved searches, account settings
7. **Admin Panel** (private, shared by superior admins; scoped views for sub-admins per their permissions) — vendor approval queue, listing verification queue, verification/badge management, sub-admin management, ad/sponsorship approval queue, company ad creation, pricing control panel, report-handling queue, job-application review, platform analytics
8. **Pricing** — Free vs Pro tiers, 1-month full-access trial, ad/sponsorship pricing — all figures pulled live from `platform_settings`, FAQ section (question-based H2/H3 for GEO)
9. **About/Contact** — company info, general contact form, FAQ section
10. **Careers / "Work With Us"** (public, no login required) — job application form (name, contact info, role interest, short pitch); submissions feed the Applications queue in the Admin Panel
11. **Legal pages** (public, required) — Terms of Service (explicitly stating DBMartNG facilitates discovery/contact but is not a party to or guarantor of any off-platform transaction, per Section 3.4), Privacy Policy, and an NDPR-compliant data-handling policy covering how buyer/vendor personal data is collected, stored, and used
12. **404 / error pages**

Persistent header: logo, search bar, nav links, login/signup or account menu (per auth state). Footer with key links, including "Work With Us."

---

## 8. AI CHATBOT & LIVE CHAT

- **Gemini-powered AI chatbot:** integrate the Google Gemini API for an in-site assistant that (a) answers general questions about how DBMartNG works (pricing, becoming a vendor, contacting a vendor) and (b) helps buyers find relevant businesses/products via natural-language queries (e.g. "find me a bakery in Lagos") by querying the vendor/listing database and returning relevant matches conversationally.
- **Live chat widget:** integrate a live chat widget (e.g. Tawk.to or similar) as an alternate option alongside the AI chatbot.
- Wrap both in error boundaries — if either goes down, the rest of the site must keep working (see Section 11).

---

## 9. DATA MODEL (guidance — adjust as needed)

At minimum, design tables for (note: `vendor_profiles`, `listings`, and `company_ads` store **Cloudflare R2 URLs** for images/logos/banners — Supabase never stores the binary files themselves, per Section 6):
- `users` (role: buyer/vendor/admin, auth info)
- `vendor_profiles` (business info, category, verification status, subscription status, trial end date, trial-decision state, store hours (structured, per-day open/close times) for the "Open Now" indicator, `average_response_time` recomputed periodically from `messages` timestamps for the responsiveness signal)
- `listings` (product/service info, linked to vendor, plus `status`, `status_reason`, `reviewed_by`, `reviewed_at` — Section 3.3)
- `categories`
- `messages` (buyer-to-vendor conversations)
- `favorites` (buyer-saved vendors)
- `subscriptions` (**Paystack** subscription/customer code reference, plan code, tier, status, next renewal date, price paid at signup for grandfathering)
- `processed_webhook_events` (Section 6.2 — idempotency guard for Paystack webhooks: `event_id`, `event_type`, `processed_at`)
- `admin_allowlist` (Section 3.1 — the two superior-admin identifiers)
- `admin_audit_log` (Section 3.1/3.2 — every admin and sub-admin action, individually attributable)
- `sub_admins` and `sub_admin_permissions` (Section 3.2)
- `job_applications` (Section 2/7 — "Work With Us" submissions, status: pending/reviewed/invited/rejected)
- `ad_requests` (Section 6.1 — vendor-purchased campaigns: target type, status, duration, price paid)
- `company_ads` (Section 6.1 — admin-created house ads: title, banner, link, start/end)
- `platform_settings` (Section 6.1 — admin-editable pricing and slot-control values: subscription price, ad pricing, free-tier listing limit, sponsored slot mode/count, transactional "from" email addresses, `admin_2fa_required` toggle)
- `site_content` (Section 6.3 — no-code-editable page copy/headlines/microcopy, keyed and versioned for revert)
- `provider_credentials` (Section 6.3 — database-backed API keys/settings for Gemini, Paystack, SMS/email providers, and which adapter is active for swappable integrations, versioned for revert)
- `notifications` (Section 2.1 — unified notification feed for all roles)
- `system_alerts` (Section 2.2 — technical/integration health log)
- `reviews` and `vendor_complaints` (Section 3.4 — review eligibility tied to prior contact, vendor's single public reply, complaint/dispute tracking)
- `referrals` (Section 2/12 — tracks both buyer and vendor referral codes/rewards, with a `type` field distinguishing the two programs)

---

## 10. SEO & DISCOVERABILITY

**Rendering & metadata**
- Use the Next.js App Router Metadata API (`generateMetadata`) on every route — dynamic titles/descriptions per vendor profile, category, and city page.
- SSR or ISR every indexable page (vendor profiles, category pages, listings). Never client-side-only rendering for indexable content.
- `metadataBase: new URL("https://dbmart.ng")` in root layout — every canonical URL, OG URL, and sitemap entry derives from this single config.
- Open Graph tags, Twitter Card tags, `themeColor: "#0B3C7B"` in viewport config.

**Structured data (JSON-LD)** — five schema types minimum:
1. `Organization` — sitewide, root layout, referencing the metallic logo render as the `logo` field.
2. `LocalBusiness` — every vendor profile, populated from real data. Never fabricate ratings/reviews not on the page.
3. `Product` / `Service` — every listing.
4. `BreadcrumbList` — Home → Category → Vendor → Listing.
5. `FAQPage` — Pricing, About, and every category page.

Validate every schema type with Google's Rich Results Test before each deploy.

**Crawlability**
- `app/sitemap.ts` — dynamically generated from live (approved + active) vendors/listings, regenerated on schedule or via webhook on vendor approval.
- `app/robots.ts` — allow all crawlers on public pages; disallow `/admin`, `/dashboard`, `/account`, `/api`. Never block CSS/JS.
- Semantic HTML: `<article>` for listings, `<nav>` for navigation, `<aside>` for sidebars.
- Clean, descriptive URLs (`/vendors/lagos-bakery`, not `/vendor?id=1234`).

**AI / answer-engine visibility (GEO)**
- Lead every vendor/category page with a one-sentence, plain-language answer to "what is this" before decorative content.
- FAQ sections on category pages using question-based headings ("Where can I find verified fashion vendors in Lagos?").
- Auto-regenerate a vendor's `LocalBusiness` schema whenever they edit their profile — trigger this via a Supabase database trigger/webhook on profile update, not on every page load.

**Core Web Vitals targets**

| Metric | Target | Primary lever |
|---|---|---|
| LCP | < 2.5s | `next/image` everywhere, preload hero LCP element, self-host fonts via `next/font` |
| INP | < 200ms | Lenis smooth scroll, debounced handlers, lazy 3D canvas |
| CLS | < 0.1 | Reserve space for 3D canvas with `aspect-ratio`, no layout-shifting font swaps |
| TTFB | < 600ms | Edge functions, Supabase caching, ISR on vendor pages |

Set a Lighthouse CI budget in the deploy pipeline; fail the build if any metric regresses past threshold. Target 95+ Lighthouse across Performance, Accessibility, Best Practices, and SEO.

**Ongoing ops (README checklist)**
- Submit sitemap to Google Search Console at launch.
- Weekly: Coverage report (indexed vs. excluded) and Rich Results report (schema errors).

---

## 11. "ALWAYS VISIBLE" RELIABILITY

- **Uptime monitoring:** scheduled ping (Vercel Cron or external monitor) alerting on homepage or vendor-profile 5xx.
- **Graceful degradation:** if the Gemini AI assistant, live chat widget, or **Paystack** checkout iframe fails to load, the rest of the site (browse, contact, profiles) keeps working — wrap all third-party integrations in error boundaries.
- **Stale-while-revalidate:** ISR with a sane revalidation window on vendor/listing pages — a brief backend hiccup still serves the last-known-good version instead of an error.
- **PWA basics:** web manifest + service worker, installable, lightweight offline fallback ("you're offline — your last-viewed vendors are cached"). Lays groundwork for a future native-app wrapper.
- **Real-time status accuracy:** never cache a vendor's active/verified badge for more than a few minutes. Sync this from Paystack webhook events (`subscription.disable`, `invoice.payment_failed`) so an expired subscription never shows as "live."
- **Supabase free-tier keep-alive:** while the project runs on Supabase's free tier, a scheduled job (Vercel Cron or a GitHub Actions workflow) must ping the database with a lightweight query (e.g. `SELECT 1` against any small table) at least every 3–4 days, since Supabase auto-pauses free projects after 7 days of zero API activity. This is a temporary measure for the free-tier period only — document in the README that this becomes unnecessary once the project is upgraded to Supabase Pro, and that Pro should be prioritized once vendor image/traffic volume grows (see the file-storage note in Section 6).
- **Automated backups & disaster recovery:** the Supabase free tier has no built-in automated backups, so until the project is upgraded to Pro, implement a DIY backup workflow: a scheduled GitHub Actions job that runs `pg_dump` against the database on a regular interval (daily recommended) and pushes the resulting dump to a dedicated Cloudflare R2 bucket (separate from the media-storage bucket in Section 6). Document the exact restore steps (how to pull the latest dump from R2 and restore it into a Supabase project) in the README — this is not optional given real vendor, buyer, and payment-linked data is stored from launch. Once upgraded to Supabase Pro, switch to Supabase's native automated backups and retire the DIY workflow.

---

## 12. ENGAGEMENT, RETENTION & TRUST

- **Retention mechanics:**
  - Buyers: recently viewed, saved searches with notify-on-match, wishlist/favorites, referral program.
  - Vendors: tiered visibility (Pro placement), analytics dashboard, promotional tools (flash sales, coupon codes, featured-listing boosts), vendor-to-vendor referral program with a free-month reward (Section 2).
- **Search upgrades:** typo correction, instant/incremental results, search history, trending searches; voice and image search as stretch goals.
- **Social proof:** real-time activity toasts sourced from actual Supabase realtime events — never fabricated in production.
- **CRO instrumentation:** Microsoft Clarity or Hotjar for heatmaps/session recordings; A/B test CTA copy ("Contact Vendor" vs. "Message Now"); exit-intent modal for save-for-later/email capture. Include a cookie-consent banner before loading any session-recording or analytics script, given the general-public audience.

---

## 13. SECURITY & TRUST

Rate limiting (including a dedicated, tighter rate limit specifically on buyer-to-vendor in-site messaging to prevent spam/harassment between any single buyer-vendor pair), CSRF/XSS protection, SQL-injection prevention, Row Level Security in Supabase, CAPTCHA on public forms, secure auth, audit logs, spam/fraud detection with an admin approval workflow for new vendor listings, automated basic image AND text moderation on listing photos, listing descriptions, and in-site messages (Section 2), duplicate vendor account detection at signup (phone/Paystack reference/device fingerprint matching, surfaced to reviewers rather than auto-blocked), and a "report business/listing" flow for users. Verify Paystack webhook signatures on every incoming event before trusting subscription-status changes.

**Legal & compliance:** publish Terms of Service, a Privacy Policy, and an NDPR-compliant data policy (Section 7) covering collection, storage, and use of buyer/vendor personal data. The Terms of Service must explicitly state that DBMartNG facilitates business discovery and contact but is not a party to, and does not guarantee, any transaction that occurs off-platform between a buyer and vendor (Section 3.4).

---

## 14. ACCESSIBILITY & MOBILE

Screen-reader support, full keyboard navigation, ARIA labels, dark mode, high-contrast mode, and `prefers-reduced-motion` respected everywhere motion is used (not just the 3D hero). Mobile: bottom navigation, pull-to-refresh, swipe gestures, installable PWA, offline fallback.

---

## 15. FUTURE-PROOFING

Architect data models and routing so the platform can later support: native Android/iOS apps, multi-language and multi-currency (including non-Paystack payment rails if expanding beyond Africa), additional countries beyond Nigeria, AI-generated vendor descriptions, AI image enhancement for listing photos, AI-driven fraud detection, stricter vendor KYC (CAC registration number, government ID upload) beyond the phone-OTP-only baseline used at launch, a public API/partner data feed, and a **low-data/"lite" mode** (no 3D hero, minimal/compressed images, reduced animation) for buyers and vendors on limited mobile data plans — not built now, but keep the component structure decoupled enough (Section 6, Section 5) that a lite variant can be added later without a rebuild.

---

## 16. CONTENT

No final copy has been provided — generate clean, professional placeholder copy for all headlines, descriptions, and microcopy across the entire site, including the Credits/About/Founders page bios. This placeholder text should read as complete and professional, not as filler gibberish — it's a draft that can be edited later, not a final version. Use placeholder/stock-style images for vendor/product examples, but wire up the real logo assets (provided under `/public/brand/`) in the header and favicon. The Founder & Admin Profile Form (PDF, in this same project directory) supplies **functional data only** — the exact email/phone identifiers needed to seed the `admin_allowlist` table (Section 3.1) and any sub-admin permission assignments — not marketing copy; treat any bio/photo fields on that form as optional and generate placeholder bios if they're left blank. Language: English only for this build.

---

## 17. IMPLEMENTATION PRIORITY (build order — correctness over speed, no fixed timeframe)

Build in the order below. There is no deadline attached to this build — take whatever time each phase genuinely needs. Each phase must be fully functional and verified working before moving to the next; do not leave a phase half-wired, silently stubbed, or "looks done but untested" and move on to the next one. If a phase turns out to need more depth than expected (more edge cases, more testing, a subtlety in the webhook/permission logic), spend that time — a slower, correctly-working platform is the only acceptable outcome. Do not treat this list as a same-day checklist; treat it as a dependency order.

1. **Foundation first** — project scaffold (Next.js + TypeScript + Tailwind), Supabase project connected, full data model (Section 9) created and migrated, `dbmart.ng` canonical config (`metadataBase`, env vars) wired in from the start — not retrofitted later.
2. **Auth & roles** — Buyer/Vendor signup/login (email/password + Google OAuth), role-based routing and dashboards, plus the hidden admin allowlist flow (Section 3.1) fully working end-to-end.
3. **Core marketplace flows** — vendor onboarding (with phone OTP verification), listing management (with `pending_review`/`approved`/`rejected`/`flagged` status and basic automated image moderation from day one), browse/search/category pages, business profile pages, rate-limited buyer messaging, favorites, WhatsApp deep-link generation with pre-typed message. This is the functional heart of the app and must work completely before any visual polish layer is added.
4. **Paystack integration** — Plans/Subscriptions API with all payment channels enabled (card, bank transfer, USSD, mobile money), 1-month full-access trial logic, the explicit trial-expiry decision screen, webhooks (`charge.success`, `subscription.create`, `subscription.disable`, `invoice.payment_failed`) verified and updating `vendor_profiles.subscription_status` correctly, plus the reconciliation and dispute-handling logic in Section 6.2. Test the full trial-to-paid, trial-to-free, failed-payment, and chargeback-adjacent flows thoroughly before moving on — do not treat this phase as done until deliberately-simulated webhook failures are handled correctly, not just the happy path.
5. **Admin panel & sub-admin system** — vendor approval queue, listing verification queue, badge management, subscription oversight, platform analytics, report-handling queue (including buyer-submitted vendor reports, Section 2), sub-admin creation with the full permission-toggle matrix (Section 3.2), job-application review queue, dispute/complaint handling (Section 3.4).
6. **Monetization layer** — `platform_settings` pricing control panel, vendor ad/sponsorship request-and-approval flow with keyword/category-matched pinning, admin-created company ads, sponsored-slot limited/unlimited control, display-ad network integration, vendor and buyer referral programs (Section 6.1).
7. **Reviews & trust layer** — review submission gated to contacted buyers only, single vendor public reply, moderation tooling, vendor data export, Terms of Service/Privacy Policy/NDPR data policy pages published live (Section 3.4, Section 7).
8. **Notifications & system alerts** — the unified `notifications` table and in-app bell for all roles (Section 2.1), plus the `system_alerts` ops channel for Gemini/Paystack/Supabase/email failures (Section 2.2).
9. **SEO foundation** — metadata, sitemap, robots, JSON-LD structured data (including live-pulled pricing on the Pricing page), semantic HTML. Wire this in now, not as an afterthought.
10. **Motion & 3D layer** — Lenis smooth scroll sitewide, GSAP ScrollTrigger sequences on Home/Profile/Pricing, then the DB-monogram 3D hero (lazy-loaded, reduced-motion-safe, performance-capped per Section 5).
11. **AI chatbot & live chat** — Gemini integration and live chat widget, both wrapped in error boundaries.
12. **Engagement & retention layer** — social proof toasts, retention mechanics, search upgrades, CRO instrumentation (Clarity/Hotjar with cookie consent), exit-intent, "Work With Us" public application page.
13. **Reliability, security, accessibility pass** — uptime monitoring, automated Supabase backups with a documented restore process, ISR/stale-while-revalidate, PWA manifest + offline fallback, rate limiting (including messaging-specific limits), RLS policies, CAPTCHA, ARIA/keyboard nav/dark mode/reduced-motion — audit every phase above against these requirements rather than treating this as new work.
14. **Content review pass** — before treating any page as launch-ready, review all agent-generated placeholder copy against the writing-quality bar in Section 16 (reads as human-written, not generic AI phrasing, no invented specific facts about real vendors). Flag anything that needs a human pass before going live.
15. **Final QA** — run Lighthouse against the 95+ target (Section 10), validate all JSON-LD with Rich Results Test, confirm every core flow (vendor signup → listing verification → trial → Paystack subscription or downgrade → ad approval → admin/sub-admin moderation → buyer report → buyer discovery → review → contact) works end-to-end on both desktop and mobile, and confirm each phase above was actually tested, not just implemented, before calling this done.

Do not rush a phase to reach the next one faster. If something in an earlier phase turns out to be wrong once a later phase depends on it, go back and fix it properly rather than patching around it.

---

## 18. DELIVERABLES

1. A fully functional Next.js + Supabase + **Paystack** web application implementing everything above.
2. Clear role-based authentication (Buyer / Vendor / hidden-allowlist Admin / permission-scoped Sub-Admin) with separate dashboards.
3. Working subscription billing with a 1-month full-access trial and an explicit trial-expiry decision screen, via **Paystack Plans/Subscriptions** with all payment channels enabled.
4. Working listing verification workflow (`pending_review`/`approved`/`rejected`/`flagged`) usable by both superior admins and permission-scoped sub-admins.
5. Working vendor ad/sponsorship system (keyword/category-matched pinning) plus admin-created company ads, a live-editable pricing control panel, and vendor/buyer referral programs.
6. Working Gemini-powered chatbot and live chat widget integration, plus a unified notification system (Section 2.1) and a technical system-alerts channel (Section 2.2).
7. Working review system gated to contacted buyers only, with a single public vendor reply and light-touch dispute/complaint moderation (Section 3.4), plus published Terms of Service, Privacy Policy, and NDPR-compliant data policy pages.
8. Fully responsive, mobile-first UI matching the navy-and-gold DB monogram brand system, including the 3D hero and motion layer.
9. A README explaining how to configure environment variables (Supabase keys, **Paystack public/secret keys and webhook secret**, Gemini API key, display-ad network keys), run locally, deploy to Vercel, point `dbmart.ng` DNS at the deployment, and restore from an automated Supabase backup.
10. Seed/sample data (a handful of sample vendors, listings, categories, and one sample sub-admin) so the site is demonstrable immediately after setup.

---

## FINAL BUILD INSTRUCTION

Build DBMartNG on the `dbmart.ng` domain to production standards with enterprise-grade architecture, exceptional UI/UX built around the navy-and-gold DB monogram brand system, **Paystack-powered subscription billing**, advanced SEO and AI-answer-engine visibility, accessibility, performance optimization, and security. Every feature should be designed to maximize user engagement, search visibility, and future expansion. Target Lighthouse scores of 95+ across Performance, Accessibility, Best Practices, and SEO. The experience should feel comparable to leading global marketplace platforms while remaining fast, intuitive, and mobile-first — and 3D/motion effects must never come at the cost of Core Web Vitals or the speed of a buyer trying to contact a vendor.

Build this now, asking clarifying questions only where truly necessary. Where a decision isn't specified above, choose the most standard, well-supported approach for a Next.js + Supabase + Paystack marketplace application. As stated at the top of this prompt, you are free to improve on or add to this spec wherever your judgment says it would make the platform better — this document is the required baseline, not the limit of what you can build.
