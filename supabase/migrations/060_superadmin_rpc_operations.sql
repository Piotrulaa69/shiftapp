-- 060_superadmin_rpc_operations.sql
-- SECURITY DEFINER RPCs for super-admin — bypass RLS so operations
-- actually execute regardless of which RLS policies are in place.
-- Each function still verifies the caller is super-admin.

-- ── Delete restaurant ─────────────────────────────────────────────
-- Cascades to profiles, shifts, tasks, subscriptions, etc.
CREATE OR REPLACE FUNCTION public.super_admin_delete_restaurant(p_restaurant_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT COALESCE((SELECT is_super_admin FROM profiles WHERE id = auth.uid() LIMIT 1), false) THEN
    RETURN json_build_object('success', false, 'error', 'Brak uprawnień super-admina');
  END IF;

  DELETE FROM restaurants WHERE id = p_restaurant_id;

  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ── Toggle employee accounts (enable / disable) ───────────────────
CREATE OR REPLACE FUNCTION public.super_admin_toggle_accounts(p_restaurant_id UUID, p_disabled BOOLEAN)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT COALESCE((SELECT is_super_admin FROM profiles WHERE id = auth.uid() LIMIT 1), false) THEN
    RETURN json_build_object('success', false, 'error', 'Brak uprawnień super-admina');
  END IF;

  UPDATE profiles
  SET is_active = NOT p_disabled
  WHERE restaurant_id = p_restaurant_id
    AND role != 'owner';

  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ── Update restaurant data ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.super_admin_update_restaurant(
  p_restaurant_id UUID,
  p_name          TEXT,
  p_address       TEXT,
  p_phone         TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT COALESCE((SELECT is_super_admin FROM profiles WHERE id = auth.uid() LIMIT 1), false) THEN
    RETURN json_build_object('success', false, 'error', 'Brak uprawnień super-admina');
  END IF;

  UPDATE restaurants
  SET name    = p_name,
      address = p_address,
      phone   = p_phone
  WHERE id = p_restaurant_id;

  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ── Mark subscription as paid (upsert) ───────────────────────────
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

-- ── Grant execute to authenticated users ──────────────────────────
GRANT EXECUTE ON FUNCTION public.super_admin_delete_restaurant(UUID)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_toggle_accounts(UUID, BOOLEAN)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_update_restaurant(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_mark_paid(UUID)                      TO authenticated;
