-- DBMartNG Complete Database Schema
-- Migration: 001_initial_schema

-- ─── EXTENSIONS ───
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── USERS ───
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('buyer', 'vendor', 'admin', 'sub_admin')),
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CATEGORIES ───
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('goods', 'service')),
  description TEXT,
  icon TEXT,
  image_url TEXT,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── VENDOR PROFILES ───
CREATE TABLE vendor_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  email TEXT,
  phone TEXT,
  whatsapp_number TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT NOT NULL DEFAULT 'Nigeria',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_badge_granted_at TIMESTAMPTZ,
  is_vip BOOLEAN NOT NULL DEFAULT FALSE,
  vip_invited_by UUID REFERENCES users(id),
  subscription_status TEXT NOT NULL DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'pro', 'free', 'payment_failed', 'suspended')),
  trial_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  trial_decision_made BOOLEAN NOT NULL DEFAULT FALSE,
  trial_decision TEXT CHECK (trial_decision IN ('pro', 'free')),
  average_response_time INTEGER, -- in minutes
  store_hours JSONB,
  complaint_count INTEGER NOT NULL DEFAULT 0,
  social_links JSONB,
  gallery_urls TEXT[] NOT NULL DEFAULT '{}',
  video_url TEXT,
  is_sponsored BOOLEAN NOT NULL DEFAULT FALSE,
  sponsored_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('goods', 'service')),
  description TEXT,
  icon TEXT,
  image_url TEXT,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── LISTINGS ───
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES vendor_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  price DECIMAL(12, 2),
  price_period TEXT CHECK (price_period IN ('hour', 'day', 'week', 'month', 'year', 'one_time')),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'flagged')),
  status_reason TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  featured_until TIMESTAMPTZ,
  is_promoted BOOLEAN NOT NULL DEFAULT FALSE,
  promoted_until TIMESTAMPTZ,
  is_service BOOLEAN NOT NULL DEFAULT FALSE,
  tags TEXT[] NOT NULL DEFAULT '{}',
  view_count INTEGER NOT NULL DEFAULT 0,
  contact_click_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(vendor_id, slug)
);

-- ─── MESSAGES ───
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendor_profiles(id) ON DELETE CASCADE,
  subject TEXT,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── FAVORITES ───
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendor_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(buyer_id, vendor_id)
);

-- ─── SUBSCRIPTIONS ───
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES vendor_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  paystack_customer_code TEXT,
  paystack_subscription_code TEXT,
  paystack_plan_code TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('trial', 'pro', 'free')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'payment_failed')),
  price_paid DECIMAL(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ADMIN ALLOWLIST ───
CREATE TABLE admin_allowlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identifier TEXT NOT NULL UNIQUE,
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('email', 'phone')),
  claimed BOOLEAN NOT NULL DEFAULT FALSE,
  linked_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ADMIN AUDIT LOG ───
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_id TEXT,
  old_value JSONB,
  new_value JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SUB-ADMINS ───
CREATE TABLE sub_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SUB-ADMIN PERMISSIONS ───
CREATE TABLE sub_admin_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sub_admin_id UUID NOT NULL REFERENCES sub_admins(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(sub_admin_id, permission_key)
);

-- ─── JOB APPLICATIONS ───
CREATE TABLE job_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role_interest TEXT NOT NULL,
  pitch TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'invited', 'rejected')),
  reviewed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── AD REQUESTS ───
CREATE TABLE ad_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES vendor_profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('listing', 'bundle', 'account')),
  target_ids UUID[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  duration_days INTEGER NOT NULL,
  price_paid DECIMAL(12, 2) NOT NULL DEFAULT 0,
  paystack_reference TEXT,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── COMPANY ADS ───
CREATE TABLE company_ads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  banner_url TEXT,
  destination_url TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PLATFORM SETTINGS ───
CREATE TABLE platform_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- ─── SITE CONTENT ───
CREATE TABLE site_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  previous_value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- ─── PROVIDER CREDENTIALS ───
CREATE TABLE provider_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service TEXT NOT NULL,
  key_name TEXT NOT NULL,
  key_value TEXT NOT NULL,
  previous_value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),
  UNIQUE(service, key_name)
);

-- ─── NOTIFICATIONS ───
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  payload JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SYSTEM ALERTS ───
CREATE TABLE system_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL,
  error_detail TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  resolved_at TIMESTAMPTZ,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── REVIEWS ───
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendor_profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  body TEXT,
  vendor_reply TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(buyer_id, vendor_id)
);

-- ─── VENDOR COMPLAINTS ───
CREATE TABLE vendor_complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES vendor_profiles(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  resolved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── REFERRALS ───
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referrer_type TEXT NOT NULL CHECK (referrer_type IN ('buyer', 'vendor')),
  referred_id UUID REFERENCES users(id),
  referred_email TEXT,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'rewarded', 'expired')),
  reward_granted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PROCESSED WEBHOOK EVENTS ───
CREATE TABLE processed_webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── VIP INVITATIONS ───
CREATE TABLE vip_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identifier TEXT NOT NULL UNIQUE,
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('email', 'phone')),
  invited_by UUID NOT NULL REFERENCES users(id),
  claimed BOOLEAN NOT NULL DEFAULT FALSE,
  linked_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SAVED SEARCHES ───
CREATE TABLE saved_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  filters JSONB,
  notify_on_match BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ───
CREATE INDEX idx_vendor_profiles_user_id ON vendor_profiles(user_id);
CREATE INDEX idx_vendor_profiles_slug ON vendor_profiles(slug);
CREATE INDEX idx_vendor_profiles_category ON vendor_profiles(category_id);
CREATE INDEX idx_vendor_profiles_verified ON vendor_profiles(is_verified);
CREATE INDEX idx_vendor_profiles_subscription ON vendor_profiles(subscription_status);
CREATE INDEX idx_listings_vendor ON listings(vendor_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_category ON listings(category_id);
CREATE INDEX idx_listings_slug ON listings(slug);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_messages_vendor ON messages(vendor_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, read_at);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_reviews_vendor ON reviews(vendor_id);
CREATE INDEX idx_admin_audit_log_admin ON admin_audit_log(admin_user_id, timestamp DESC);
CREATE INDEX idx_site_content_key ON site_content(key);
CREATE INDEX idx_platform_settings_key ON platform_settings(key);

-- ─── ROW LEVEL SECURITY ───
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_allowlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_requests ENABLE ROW LEVEL SECURITY;

-- ─── PUBLIC READ POLICIES ───
CREATE POLICY "Public can read active categories" ON categories
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Public can read verified vendor profiles" ON vendor_profiles
  FOR SELECT USING (is_verified = TRUE OR auth.uid() = user_id);

CREATE POLICY "Public can read approved listings" ON listings
  FOR SELECT USING (status = 'approved' OR auth.uid() IN (
    SELECT user_id FROM vendor_profiles WHERE id = listings.vendor_id
  ));

-- ─── AUTHENTICATED USER POLICIES ───
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Vendors can manage own listings" ON listings
  FOR ALL USING (auth.uid() IN (
    SELECT user_id FROM vendor_profiles WHERE id = listings.vendor_id
  ));

CREATE POLICY "Users can manage own messages" ON messages
  FOR ALL USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can manage own favorites" ON favorites
  FOR ALL USING (auth.uid() = buyer_id);

CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Buyers can create reviews after messaging" ON reviews
  FOR INSERT WITH CHECK (
    auth.uid() = buyer_id AND
    EXISTS (
      SELECT 1 FROM messages
      WHERE sender_id = auth.uid() AND vendor_id = reviews.vendor_id
    )
  );

CREATE POLICY "Admins can read admin_allowlist" ON admin_allowlist
  FOR SELECT USING (auth.uid() IN (
    SELECT id FROM users WHERE role IN ('admin')
  ));

-- ─── ADMIN POLICIES ───
CREATE POLICY "Admins full access to all tables" ON vendor_profiles
  FOR ALL USING (auth.uid() IN (
    SELECT id FROM users WHERE role IN ('admin', 'sub_admin')
  ));

CREATE POLICY "Admins full access listings" ON listings
  FOR ALL USING (auth.uid() IN (
    SELECT id FROM users WHERE role IN ('admin', 'sub_admin')
  ));

CREATE POLICY "Admins full access admin_audit_log" ON admin_audit_log
  FOR INSERT USING (auth.uid() IN (
    SELECT id FROM users WHERE role IN ('admin', 'sub_admin')
  ));

-- ─── FUNCTIONS ───
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── TRIGGERS ───
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_profiles_updated_at
  BEFORE UPDATE ON vendor_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── SEED DATA: PLATFORM SETTINGS ───
INSERT INTO platform_settings (key, value) VALUES
  ('pro_subscription_price', '{"amount": 5000, "currency": "NGN", "interval": "monthly"}'),
  ('free_tier_listing_limit', '{"limit": 5}'),
  ('ad_base_price', '{"amount": 10000, "currency": "NGN", "duration_days": 30}'),
  ('sponsored_slots_mode', '{"mode": "limited", "count": 3}'),
  ('admin_2fa_required', '{"enabled": true}'),
  ('transactional_from_email', '{"email": "no-reply@dbmart.ng"}'),
  ('support_email', '{"email": "support@dbmart.ng"}');
