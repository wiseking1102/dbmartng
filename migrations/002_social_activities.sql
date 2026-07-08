-- DBMartNG Social Activities Table
-- Migration: 002_social_activities
-- Used for real-time social proof toasts showing live user activity

CREATE TABLE social_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'purchase', 'review', 'signup', 'listing_added',
    'vendor_joined', 'inquiry_sent', 'badge_earned'
  )),
  actor_name TEXT NOT NULL,
  actor_avatar TEXT,
  actor_role TEXT CHECK (actor_role IN ('buyer', 'vendor')),
  target_name TEXT,
  target_type TEXT CHECK (target_type IN ('vendor', 'listing', 'review')),
  target_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for realtime queries
CREATE INDEX idx_social_activities_created ON social_activities(created_at DESC);

-- Enable RLS but allow all authenticated users to read (for realtime)
ALTER TABLE social_activities ENABLE ROW LEVEL SECURITY;

-- Anyone can read social activities (they're public by design for social proof)
CREATE POLICY "Anyone can read social activities" ON social_activities
  FOR SELECT USING (TRUE);

-- Only authenticated users can insert (via API)
CREATE POLICY "Authenticated users can insert" ON social_activities
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
