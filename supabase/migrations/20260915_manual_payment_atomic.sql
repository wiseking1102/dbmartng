-- ═══════════════════════════════════════════════════════════════
-- DBMartNG migration: Atomic manual payment approval + duplicates guard
--
-- 1. CREATE UNIQUE INDEX on manual_payment_requests(user_id) WHERE status='pending'
--    → prevents two concurrent submissions creating duplicate pending requests
-- 2. CREATE approve_manual_payment(p_request_id, p_reviewer_id, p_admin_note, p_action)
--    → single authoritative transaction:
--        lock payment row (FOR UPDATE)
--        verify still pending
--        verify reviewer is admin OR sub_admin with payments.review
--        [approve] activate subscription, update vendor profile, approve payment
--        [reject]  mark payment rejected
--        audit log + vendor notification
--    → API routes must call this RPC instead of doing multi-statement updates
--
-- Run in Supabase SQL Editor (or supabase db push).
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- 1. One pending manual payment request per user (race-proof)
-- ─────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS uq_manual_payment_requests_one_pending_per_user
  ON public.manual_payment_requests(user_id)
  WHERE status = 'pending';

-- ─────────────────────────────────────────────
-- 2. Authoritative atomic approval function
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.approve_manual_payment(
  p_request_id   UUID,
  p_reviewer_id  UUID,
  p_admin_note   TEXT DEFAULT NULL,
  p_action       TEXT DEFAULT 'approve'   -- 'approve' | 'reject'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment        RECORD;
  v_reviewer_role  TEXT;
  v_has_permission BOOLEAN;
  v_existing_sub   RECORD;
  v_period_start   TIMESTAMPTZ;
  v_period_end     TIMESTAMPTZ;
  v_business_name  TEXT;
  v_vendor_email   TEXT;
BEGIN
  -- ── Validate action ─────────────────────────────────────────
  IF p_action NOT IN ('approve', 'reject') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action. Must be approve or reject.');
  END IF;

  -- ── Reviewer identity + role ────────────────────────────────
  IF p_reviewer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reviewer identity required.');
  END IF;

  SELECT role INTO v_reviewer_role FROM public.users WHERE id = p_reviewer_id;

  IF v_reviewer_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reviewer not found.');
  END IF;

  -- ── Permission check: admin OR sub_admin with payments.review ──
  v_has_permission := (v_reviewer_role = 'admin');

  IF NOT v_has_permission AND v_reviewer_role = 'sub_admin' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.sub_admin_permissions sap
      JOIN public.sub_admins sa ON sa.id = sap.sub_admin_id
      WHERE sa.user_id = p_reviewer_id
        AND sa.status = 'active'
        AND sap.permission_key = 'payments.review'
        AND sap.granted = true
    ) INTO v_has_permission;
  END IF;

  IF NOT v_has_permission THEN
    RETURN jsonb_build_object('success', false, 'error', 'You do not have permission to review payments.');
  END IF;

  -- ── Lock the payment row (serialises concurrent approvals) ──
  SELECT * INTO v_payment
  FROM public.manual_payment_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment request not found.');
  END IF;

  IF v_payment.status <> 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This payment request has already been ' || v_payment.status || '.',
      'status', v_payment.status
    );
  END IF;

  v_period_start := now();
  v_period_end   := now() + INTERVAL '30 days';

  -- ═════════════════════════════════════════════════════════════
  -- REJECT — no subscription changes
  -- ═════════════════════════════════════════════════════════════
  IF p_action = 'reject' THEN
    UPDATE public.manual_payment_requests
    SET status = 'rejected',
        reviewed_at = now(),
        reviewed_by = p_reviewer_id,
        admin_note  = COALESCE(NULLIF(trim(p_admin_note), ''), admin_note),
        updated_at  = now()
    WHERE id = v_payment.id AND status = 'pending';

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Payment request was already processed.');
    END IF;

    -- Audit log
    INSERT INTO public.admin_audit_log (admin_user_id, action, target_id, old_value, new_value)
    VALUES (
      p_reviewer_id,
      'manual_payment_rejected',
      v_payment.id,
      jsonb_build_object('status', 'pending'),
      jsonb_build_object('status', 'rejected', 'amount', v_payment.amount, 'currency', v_payment.currency)
    );

    -- Notify vendor (non-fatal on failure)
    BEGIN
      INSERT INTO public.notifications (user_id, type, title, body)
      VALUES (
        v_payment.user_id,
        'payment_rejected',
        'Payment request rejected',
        'Your manual payment request could not be verified. Please contact support or resubmit with a valid payment reference.'
      );
    EXCEPTION WHEN OTHERS THEN
      NULL; -- notification failure must not roll back the rejection
    END;

    RETURN jsonb_build_object('success', true, 'action', 'rejected', 'message', 'Manual payment request rejected.');
  END IF;

  -- ═════════════════════════════════════════════════════════════
  -- APPROVE — activate subscription atomically
  -- ═════════════════════════════════════════════════════════════

  -- Find existing Pro subscription for this user
  SELECT id INTO v_existing_sub
  FROM public.subscriptions
  WHERE user_id = v_payment.user_id AND tier = 'pro'
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.subscriptions
    SET vendor_id = v_payment.vendor_id,
        user_id = v_payment.user_id,
        paystack_customer_code = NULL,
        paystack_subscription_code = NULL,
        paystack_plan_code = NULL,
        tier = 'pro',
        status = 'active',
        price_paid = v_payment.amount,
        currency = COALESCE(v_payment.currency, 'NGN'),
        current_period_start = v_period_start,
        current_period_end = v_period_end,
        cancelled_at = NULL,
        updated_at = now()
    WHERE id = v_existing_sub.id;
  ELSE
    INSERT INTO public.subscriptions (
      vendor_id, user_id,
      paystack_customer_code, paystack_subscription_code, paystack_plan_code,
      tier, status, price_paid, currency,
      current_period_start, current_period_end
    ) VALUES (
      v_payment.vendor_id, v_payment.user_id,
      NULL, NULL, NULL,
      'pro', 'active', v_payment.amount, COALESCE(v_payment.currency, 'NGN'),
      v_period_start, v_period_end
    );
  END IF;

  -- Keep vendor profile display status in sync (canonical value: 'pro')
  UPDATE public.vendor_profiles
  SET subscription_status = 'pro',
      updated_at = now()
  WHERE id = v_payment.vendor_id;

  -- Mark payment approved
  UPDATE public.manual_payment_requests
  SET status = 'approved',
      reviewed_at = now(),
      reviewed_by = p_reviewer_id,
      admin_note  = COALESCE(NULLIF(trim(p_admin_note), ''), admin_note),
      updated_at  = now()
  WHERE id = v_payment.id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment request was concurrently processed — subscription activation rolled back.';
  END IF;

  -- Audit log
  INSERT INTO public.admin_audit_log (admin_user_id, action, target_id, old_value, new_value)
  VALUES (
    p_reviewer_id,
    'manual_payment_approved',
    v_payment.id,
    jsonb_build_object('status', 'pending'),
    jsonb_build_object(
      'status', 'approved',
      'amount', v_payment.amount,
      'currency', v_payment.currency,
      'user_id', v_payment.user_id,
      'vendor_id', v_payment.vendor_id,
      'period_end', v_period_end
    )
  );

  -- Notify vendor (non-fatal on failure)
  SELECT business_name, email INTO v_business_name, v_vendor_email
  FROM public.vendor_profiles
  WHERE id = v_payment.vendor_id;

  BEGIN
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (
      v_payment.user_id,
      'payment_approved',
      'Pro subscription activated',
      COALESCE(v_business_name, 'Your vendor account') || ' is now Pro until ' || to_char(v_period_end, 'DD Mon YYYY') || '.'
    );
  EXCEPTION WHEN OTHERS THEN
    NULL; -- notification failure must not roll back the approval
  END;

  RETURN jsonb_build_object(
    'success', true,
    'action', 'approved',
    'paymentApproved', true,
    'activated', true,
    'profileUpdated', true,
    'message', 'Manual payment approved and Pro subscription activated.',
    'period_end', v_period_end
  );
END;
$$;

-- Revoke direct execution from anon/authenticated (service role + admin calls only)
REVOKE ALL ON FUNCTION public.approve_manual_payment(UUID, UUID, TEXT, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_manual_payment(UUID, UUID, TEXT, TEXT) TO service_role;
