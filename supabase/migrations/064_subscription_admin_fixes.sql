-- 064_subscription_admin_fixes.sql
-- Fixes super-admin "Przedłuż trial" and "Oznacz jako opłacone" not persisting,
-- and owner accounts still showing "Okres próbny wygasł" after an admin action.
--
-- Root causes addressed here:
--   1. extend_trial had NO SECURITY DEFINER RPC → the app wrote to `subscriptions`
--      directly and RLS silently blocked it (0 rows, no error) so nothing saved.
--   2. Duplicate subscription rows per restaurant made the owner-side
--      .maybeSingle() read error out → the app fell back to created_at + 30 days
--      (expired for older accounts), so the "trial expired" banner never cleared.
--   3. Re-affirms mark_paid RPC and the subscriptions_api view in case migrations
--      060 / 062 were never applied to production.

-- ── 1. Deduplicate subscriptions — keep one row per restaurant ────────
-- Prefer an active row, then the most recently updated / created one.
DELETE FROM public.subscriptions
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY restaurant_id
      ORDER BY (status = 'active') DESC,
               updated_at DESC NULLS LAST,
               created_at DESC NULLS LAST
    ) AS rn
    FROM public.subscriptions
  ) t
  WHERE t.rn > 1
);

-- Prevent future duplicates (also makes upserts on restaurant_id reliable).
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_restaurant_id_uidx
  ON public.subscriptions (restaurant_id);

-- ── 2. Extend trial RPC (SECURITY DEFINER, bypasses RLS) ─────────────
CREATE OR REPLACE FUNCTION public.super_admin_extend_trial(p_restaurant_id UUID, p_days INT DEFAULT 30)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trial_end DATE := (CURRENT_DATE + (p_days || ' days')::INTERVAL)::DATE;
  v_existing  UUID;
BEGIN
  IF NOT COALESCE((SELECT is_super_admin FROM profiles WHERE id = auth.uid() LIMIT 1), false) THEN
    RETURN json_build_object('success', false, 'error', 'Brak uprawnień super-admina');
  END IF;

  SELECT id INTO v_existing FROM subscriptions WHERE restaurant_id = p_restaurant_id LIMIT 1;

  IF v_existing IS NOT NULL THEN
    UPDATE subscriptions
    SET status        = 'trial',
        trial_ends_at = v_trial_end,
        updated_at    = NOW()
    WHERE id = v_existing;
  ELSE
    INSERT INTO subscriptions (restaurant_id, plan, status, billing_period, amount, currency, trial_ends_at)
    VALUES (p_restaurant_id, 'basic', 'trial', 'monthly', 99.00, 'PLN', v_trial_end);
  END IF;

  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ── 3. Re-affirm mark_paid RPC (idempotent — ensures it exists) ──────
CREATE OR REPLACE FUNCTION public.super_admin_mark_paid(p_restaurant_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today      DATE := CURRENT_DATE;
  v_next_month DATE := CURRENT_DATE + INTERVAL '30 days';
  v_existing   UUID;
BEGIN
  IF NOT COALESCE((SELECT is_super_admin FROM profiles WHERE id = auth.uid() LIMIT 1), false) THEN
    RETURN json_build_object('success', false, 'error', 'Brak uprawnień super-admina');
  END IF;

  SELECT id INTO v_existing FROM subscriptions WHERE restaurant_id = p_restaurant_id LIMIT 1;

  IF v_existing IS NOT NULL THEN
    UPDATE subscriptions
    SET status            = 'active',
        last_payment_date = v_today,
        next_payment_date = v_next_month,
        updated_at        = NOW()
    WHERE id = v_existing;
  ELSE
    INSERT INTO subscriptions (restaurant_id, plan, status, billing_period, amount, currency, last_payment_date, next_payment_date)
    VALUES (p_restaurant_id, 'basic', 'active', 'monthly', 99.00, 'PLN', v_today, v_next_month);
  END IF;

  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ── 4. Re-affirm subscriptions_api view (idempotent) ─────────────────
DROP VIEW IF EXISTS public.subscriptions_api;
CREATE VIEW public.subscriptions_api AS
SELECT
  id, restaurant_id, status, plan, billing_period, amount, currency,
  trial_ends_at, last_payment_date, next_payment_date, notes,
  current_period_start, current_period_end, base_price, extra_employee_price,
  employee_count, total_amount, stripe_customer_id, stripe_subscription_id,
  stripe_payment_intent_id, stripe_checkout_session_id, created_at, updated_at
FROM public.subscriptions;

GRANT SELECT ON public.subscriptions_api TO anon;
GRANT SELECT ON public.subscriptions_api TO authenticated;

-- ── 5. Grants ────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.super_admin_extend_trial(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_mark_paid(UUID)         TO authenticated;
