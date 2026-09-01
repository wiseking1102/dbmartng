/**
 * Database migration: Add manual_payment_requests table
 * 
 * This table stores manual payment requests from vendors when Paystack is unavailable.
 * Admins review and approve/reject these requests.
 * Only after admin approval is the subscription activated.
 */

-- Create manual_payment_requests table
CREATE TABLE IF NOT EXISTS public.manual_payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendor_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'NGN',
  bank_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  payment_reference VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_manual_payment_requests_vendor_id ON public.manual_payment_requests(vendor_id);
CREATE INDEX IF NOT EXISTS idx_manual_payment_requests_user_id ON public.manual_payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_payment_requests_status ON public.manual_payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_manual_payment_requests_created_at ON public.manual_payment_requests(created_at);

-- Enable RLS
ALTER TABLE public.manual_payment_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Vendors can view their own requests
CREATE POLICY "Vendors can view own payment requests" ON public.manual_payment_requests
  FOR SELECT USING (user_id = auth.uid());

-- RLS Policy: Vendors can insert their own requests
CREATE POLICY "Vendors can submit payment requests" ON public.manual_payment_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policy: Admins can view all requests
CREATE POLICY "Admins can view all payment requests" ON public.manual_payment_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'sub_admin')
    )
  );

-- RLS Policy: Admins can update requests
CREATE POLICY "Admins can update payment requests" ON public.manual_payment_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'sub_admin')
    )
  );
