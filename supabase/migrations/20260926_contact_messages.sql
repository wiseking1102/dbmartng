-- ═══════════════════════════════════════════════════════════════
-- DBMartNG migration: Contact messages (support workflow)
--
-- 1. Creates public.contact_messages if missing
-- 2. Enables RLS: public can INSERT only; admins read/update
-- 3. Status values: new | in_progress | resolved | spam
--
-- Run in Supabase SQL Editor (or supabase db push).
-- ═══════════════════════════════════════════════════════════════

-- 1. Table (idempotent)
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(200) NOT NULL,
  phone VARCHAR(30),
  subject VARCHAR(200),
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'in_progress', 'resolved', 'spam')),
  admin_note TEXT,
  resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_contact_messages_status
  ON public.contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at
  ON public.contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_email
  ON public.contact_messages(email);

-- 3. RLS
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Anyone (even anonymous) may submit via the public form
DROP POLICY IF EXISTS "Public can submit contact messages" ON public.contact_messages;
CREATE POLICY "Public can submit contact messages" ON public.contact_messages
  FOR INSERT
  WITH CHECK (true);

-- Only admins/sub-admins can read submissions
DROP POLICY IF EXISTS "Admins can view contact messages" ON public.contact_messages;
CREATE POLICY "Admins can view contact messages" ON public.contact_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'sub_admin')
    )
  );

-- Only admins/sub-admins can update status (support workflow)
DROP POLICY IF EXISTS "Admins can update contact messages" ON public.contact_messages;
CREATE POLICY "Admins can update contact messages" ON public.contact_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'sub_admin')
    )
  );

-- No public UPDATE/DELETE — nothing else is granted.
