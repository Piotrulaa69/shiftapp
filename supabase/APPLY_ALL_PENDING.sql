-- ============================================================
-- APPLY_ALL_PENDING.sql — uruchom w Supabase → SQL Editor (raz).
-- Wszystkie bloki sa idempotentne (mozna uruchomic wielokrotnie).
-- ============================================================


-- ▼▼▼ 060_superadmin_rpc_operations.sql ▼▼▼
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
-- ▲▲▲ 060_superadmin_rpc_operations.sql ▲▲▲


-- ▼▼▼ 061_add_gclid_to_profiles.sql ▼▼▼
-- 061_add_gclid_to_profiles.sql
-- Przechowuje Google Click ID z reklam Google Ads
-- Zapisywany podczas rejestracji jeżeli użytkownik przyszedł z reklamy
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gclid TEXT;
-- ▲▲▲ 061_add_gclid_to_profiles.sql ▲▲▲


-- ▼▼▼ 062_fix_subscriptions_api_view.sql ▼▼▼
-- 062_fix_subscriptions_api_view.sql
-- Add missing columns to subscriptions_api view:
-- trial_ends_at, last_payment_date, next_payment_date, billing_period, currency, notes

DROP VIEW IF EXISTS public.subscriptions_api;

CREATE VIEW public.subscriptions_api AS
SELECT
  id,
  restaurant_id,
  status,
  plan,
  billing_period,
  amount,
  currency,
  trial_ends_at,
  last_payment_date,
  next_payment_date,
  notes,
  current_period_start,
  current_period_end,
  base_price,
  extra_employee_price,
  employee_count,
  total_amount,
  stripe_customer_id,
  stripe_subscription_id,
  stripe_payment_intent_id,
  stripe_checkout_session_id,
  created_at,
  updated_at
FROM public.subscriptions;

GRANT SELECT ON public.subscriptions_api TO anon;
GRANT SELECT ON public.subscriptions_api TO authenticated;
-- ▲▲▲ 062_fix_subscriptions_api_view.sql ▲▲▲


-- ▼▼▼ 063_availability_approval_status.sql ▼▼▼
-- 063_availability_approval_status.sql
-- Adds approval_status to availability table so managers can approve/reject
-- employee-submitted availability when availability_require_manager_approval is true.
-- Default 'approved' so all existing records remain valid.

ALTER TABLE public.availability
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved'
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));

ALTER TABLE public.availability
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.availability
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
-- ▲▲▲ 063_availability_approval_status.sql ▲▲▲


-- ▼▼▼ 063_superadmin_owner_emails.sql ▼▼▼
-- 063_superadmin_owner_emails.sql
-- SECURITY DEFINER function that lets super-admins read owner emails from auth.users.
-- Regular authenticated users cannot query auth.users directly.

CREATE OR REPLACE FUNCTION public.super_admin_get_owner_emails()
RETURNS TABLE(restaurant_id UUID, owner_email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT COALESCE(
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid() LIMIT 1),
    false
  ) THEN
    RAISE EXCEPTION 'Brak uprawnień super-admina';
  END IF;

  RETURN QUERY
  SELECT p.restaurant_id, u.email::TEXT
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.role = 'owner'
    AND p.is_super_admin = false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.super_admin_get_owner_emails() TO authenticated;
-- ▲▲▲ 063_superadmin_owner_emails.sql ▲▲▲


-- ▼▼▼ 064_subscription_admin_fixes.sql ▼▼▼
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
-- ▲▲▲ 064_subscription_admin_fixes.sql ▲▲▲


-- ▼▼▼ 065_restaurant_settings_ai_columns.sql ▼▼▼
-- 065_restaurant_settings_ai_columns.sql
-- Root cause of "nie da się zapisać" (restaurant settings incl. minimalna obsada):
-- the app's RestaurantSettings type / DEFAULT_SETTINGS include extended AI columns
-- that were never added to the restaurant_settings table (043 created only a
-- limited column set). upsertRestaurantSettings() sends ALL fields, so PostgREST
-- rejected the ENTIRE request with "column ... does not exist" and nothing saved,
-- including min_staffing.
--
-- This adds every missing column (idempotent) so the full settings payload persists.

ALTER TABLE public.restaurant_settings
  ADD COLUMN IF NOT EXISTS ai_prefer_same_shifts       BOOLEAN  DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS ai_respect_day_off_requests BOOLEAN  DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS ai_balance_weekends         BOOLEAN  DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS ai_avoid_single_day_gaps    BOOLEAN  DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS ai_use_shift_types          BOOLEAN  DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_default_shift_start      TEXT     DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS ai_default_shift_end        TEXT     DEFAULT '16:00',
  ADD COLUMN IF NOT EXISTS ai_min_hours_per_employee   INTEGER  DEFAULT 20,
  ADD COLUMN IF NOT EXISTS ai_max_consecutive_days     INTEGER  DEFAULT 5,
  ADD COLUMN IF NOT EXISTS ai_notes                    TEXT     DEFAULT '';
-- ▲▲▲ 065_restaurant_settings_ai_columns.sql ▲▲▲


-- ▼▼▼ 066_subscriptions_plan_id_nullable.sql ▼▼▼
-- 066_subscriptions_plan_id_nullable.sql
-- The live `subscriptions` table has an out-of-band `plan_id` column (NOT NULL)
-- that was never defined in any migration. The app uses the text `plan` column
-- ('basic'/'premium'), never plan_id, and the super_admin_mark_paid /
-- super_admin_extend_trial INSERTs don't set it — causing:
--   null value in column "plan_id" of relation "subscriptions" violates not-null
-- Make plan_id nullable so admin inserts succeed. No-op if the column is absent.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name  = 'subscriptions'
      AND column_name = 'plan_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.subscriptions ALTER COLUMN plan_id DROP NOT NULL';
  END IF;
END $$;
-- ▲▲▲ 066_subscriptions_plan_id_nullable.sql ▲▲▲


-- ▼▼▼ 067_admin_create_employee.sql ▼▼▼
-- 067_admin_create_employee.sql
-- Lets an owner/manager create an employee's profile row for a freshly signed-up
-- auth user. RLS on profiles only allows inserting your OWN profile (id = auth.uid()),
-- so the admin cannot insert a row for someone else — this SECURITY DEFINER RPC does it
-- after verifying the caller is an owner/manager, and always uses the caller's restaurant.

CREATE OR REPLACE FUNCTION public.admin_create_employee(
  p_user_id    UUID,
  p_first_name TEXT,
  p_last_name  TEXT,
  p_job_title  TEXT,
  p_role       TEXT DEFAULT 'employee',
  p_phone      TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role  TEXT;
  v_restaurant   UUID;
  v_role         TEXT;
  v_colors       TEXT[] := ARRAY['#2196C9','#22C55E','#F97316','#A855F7','#EAB308','#EF4444','#0F172A'];
  v_color        TEXT;
BEGIN
  SELECT role, restaurant_id INTO v_caller_role, v_restaurant
  FROM profiles WHERE id = auth.uid() LIMIT 1;

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner','manager') THEN
    RETURN json_build_object('success', false, 'error', 'Brak uprawnień do dodawania pracowników.');
  END IF;
  IF v_restaurant IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Brak przypisanej restauracji.');
  END IF;

  -- Only owners may create managers; managers can create employees only.
  v_role := CASE
    WHEN p_role = 'manager' AND v_caller_role = 'owner' THEN 'manager'
    ELSE 'employee'
  END;

  v_color := v_colors[1 + floor(random() * array_length(v_colors, 1))::int];

  INSERT INTO profiles (id, restaurant_id, first_name, last_name, role, job_title, phone, avatar_color, is_active)
  VALUES (p_user_id, v_restaurant, p_first_name, p_last_name, v_role, p_job_title, COALESCE(p_phone, ''), v_color, true)
  ON CONFLICT (id) DO UPDATE
    SET restaurant_id = EXCLUDED.restaurant_id,
        first_name    = EXCLUDED.first_name,
        last_name     = EXCLUDED.last_name,
        role          = EXCLUDED.role,
        job_title     = EXCLUDED.job_title,
        phone         = EXCLUDED.phone;

  RETURN json_build_object('success', true, 'restaurant_id', v_restaurant, 'role', v_role);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_employee(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
-- ▲▲▲ 067_admin_create_employee.sql ▲▲▲


-- ▼▼▼ 068_subscriptions_status_check.sql ▼▼▼
-- 068_subscriptions_status_check.sql
-- The live subscriptions table has a status CHECK constraint that rejects 'trial'
-- (the table was drifted toward Stripe statuses like 'trialing'), so
-- super_admin_extend_trial's INSERT with status='trial' fails:
--   new row for relation "subscriptions" violates check constraint "subscriptions_status_check"
--
-- The whole app reads status === 'trial' / 'active' (SubscriptionContext, TrialBanner),
-- so 'trial' MUST be a valid value. Recreate the constraint as a permissive superset
-- covering both the app's canonical values and common Stripe values. ADD ... NOT VALID
-- so the migration never fails on any pre-existing row with an unexpected status.

ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN (
    'trial', 'active', 'overdue', 'cancelled', 'paused',           -- app canonical
    'trialing', 'past_due', 'canceled', 'unpaid',                  -- Stripe
    'incomplete', 'incomplete_expired', 'expired'
  ))
  NOT VALID;
-- ▲▲▲ 068_subscriptions_status_check.sql ▲▲▲


-- ▼▼▼ 069_superadmin_support_access.sql ▼▼▼
-- 069_superadmin_support_access.sql
-- FIX: In support mode ("Wejdź jako wsparcie") a super-admin cannot configure many
-- things — employee groups, staffing settings, shift types, availability, leave,
-- announcements, courses, etc.
--
-- Why: impersonation works by patching my_restaurant_id()/my_role() (047) to honour
-- active_restaurant_id. But those tables' RLS policies use an INLINE lookup
--   restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
-- which returns the super-admin's OWN (NULL) restaurant_id, not the impersonated one —
-- so access is denied. (Migration 038 added super-admin policies but 041 reverted them.)
--
-- Fix: additively grant super-admins full access to every restaurant-scoped table
-- (same pattern as 038). This is OR-combined with existing policies, so normal
-- owner/manager/employee access is untouched. The app always queries the active
-- restaurant, so nothing extra is exposed in the UI.

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'employee_groups','employee_group_assignments','restaurant_settings','shift_types',
    'availability','work_time_rules','leave_types','leave_requests','employee_leave_quotas',
    'employee_leave_type_settings','document_templates','documents','announcements',
    'courses','lessons','topics','course_progress','topic_progress','task_instances',
    'qr_session_tokens','shifts','tasks','trainings','absences','shift_swaps','locations',
    'employee_training_progress','conversations','messages','points_ledger','clock_ins',
    'task_confirmations','quiz_questions'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'sa_support_full_access', t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL '
        || 'USING ((SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true) '
        || 'WITH CHECK ((SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true)',
        'sa_support_full_access', t
      );
    END IF;
  END LOOP;
END $$;
-- ▲▲▲ 069_superadmin_support_access.sql ▲▲▲


-- ▼▼▼ 070_employee_groups_impersonation_rls.sql ▼▼▼
-- 070_employee_groups_impersonation_rls.sql
-- Definitive fix for "grupy nie działają na wejściu" (support/impersonation mode).
--
-- The employee_groups / employee_group_assignments policies (032) scoped access with
--   restaurant_id IN (SELECT restaurant_id FROM profiles WHERE id = auth.uid())
-- which, for an impersonating super-admin, returns their OWN (NULL) restaurant — not
-- the impersonated one. Migration 047 already made impersonation work everywhere else
-- by having my_restaurant_id() / my_role() honour active_restaurant_id. Rewrite these
-- policies to use those helpers, so support mode behaves exactly like the owner.
-- Semantics for normal users are unchanged (my_restaurant_id() = their restaurant,
-- my_role() = their role).

-- ── employee_groups ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "employee_groups_select" ON public.employee_groups;
CREATE POLICY "employee_groups_select" ON public.employee_groups
  FOR SELECT USING (restaurant_id = public.my_restaurant_id());

DROP POLICY IF EXISTS "employee_groups_insert" ON public.employee_groups;
CREATE POLICY "employee_groups_insert" ON public.employee_groups
  FOR INSERT WITH CHECK (
    restaurant_id = public.my_restaurant_id() AND public.my_role() IN ('owner','manager')
  );

DROP POLICY IF EXISTS "employee_groups_update" ON public.employee_groups;
CREATE POLICY "employee_groups_update" ON public.employee_groups
  FOR UPDATE USING (
    restaurant_id = public.my_restaurant_id() AND public.my_role() IN ('owner','manager')
  ) WITH CHECK (
    restaurant_id = public.my_restaurant_id() AND public.my_role() IN ('owner','manager')
  );

DROP POLICY IF EXISTS "employee_groups_delete" ON public.employee_groups;
CREATE POLICY "employee_groups_delete" ON public.employee_groups
  FOR DELETE USING (
    restaurant_id = public.my_restaurant_id() AND public.my_role() IN ('owner','manager')
  );

-- ── employee_group_assignments (scoped through the parent group) ──────
DROP POLICY IF EXISTS "employee_group_assignments_select" ON public.employee_group_assignments;
CREATE POLICY "employee_group_assignments_select" ON public.employee_group_assignments
  FOR SELECT USING (
    group_id IN (SELECT id FROM public.employee_groups g WHERE g.restaurant_id = public.my_restaurant_id())
  );

DROP POLICY IF EXISTS "employee_group_assignments_insert" ON public.employee_group_assignments;
CREATE POLICY "employee_group_assignments_insert" ON public.employee_group_assignments
  FOR INSERT WITH CHECK (
    group_id IN (SELECT id FROM public.employee_groups g WHERE g.restaurant_id = public.my_restaurant_id())
    AND public.my_role() IN ('owner','manager')
  );

DROP POLICY IF EXISTS "employee_group_assignments_delete" ON public.employee_group_assignments;
CREATE POLICY "employee_group_assignments_delete" ON public.employee_group_assignments
  FOR DELETE USING (
    group_id IN (SELECT id FROM public.employee_groups g WHERE g.restaurant_id = public.my_restaurant_id())
    AND public.my_role() IN ('owner','manager')
  );
-- ▲▲▲ 070_employee_groups_impersonation_rls.sql ▲▲▲


-- ▼▼▼ 071_ui_translations.sql ▼▼▼
-- 071_ui_translations.sql
-- Global shared cache for automatic UI translation (EN / UK).
-- Each unique Polish UI string is machine-translated ONCE, stored here, and
-- reused by every user/device — long-term the app translates itself with no
-- dictionary maintenance and near-zero repeated API calls.

CREATE TABLE IF NOT EXISTS public.ui_translations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lang       TEXT NOT NULL CHECK (lang IN ('en','uk')),
  source     TEXT NOT NULL,
  translated TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (lang, source)
);

CREATE INDEX IF NOT EXISTS ui_translations_lang_source_idx
  ON public.ui_translations (lang, source);

ALTER TABLE public.ui_translations ENABLE ROW LEVEL SECURITY;

-- Anyone (including pre-login screens / kiosk) can read the cache.
DROP POLICY IF EXISTS "ui_translations_select" ON public.ui_translations;
CREATE POLICY "ui_translations_select" ON public.ui_translations
  FOR SELECT USING (true);

-- Logged-in users populate the cache as new strings appear.
DROP POLICY IF EXISTS "ui_translations_insert" ON public.ui_translations;
CREATE POLICY "ui_translations_insert" ON public.ui_translations
  FOR INSERT TO authenticated WITH CHECK (lang IN ('en','uk'));
-- ▲▲▲ 071_ui_translations.sql ▲▲▲


-- ▼▼▼ 072_replace_job_title_with_groups.sql ▼▼▼
-- 072_replace_job_title_with_groups.sql
-- "Stanowiska" (fixed job-title picker) are being removed from employee
-- creation/invitation — a restaurant can never enumerate every position that
-- exists across different restaurants. Employee GROUPS (032) already solve
-- this per-restaurant, so creation/invite flows now assign GROUPS instead.
--
-- The `job_title` TEXT column on profiles/invitations is NOT dropped — it's
-- read all over the app (shift assignment, reports, kiosk, training
-- targeting, min-staffing "roles" mode) and safely defaults to '' — but it is
-- no longer collected via a hardcoded list at creation/invite time.

-- ── 1. Invitations carry group_ids instead of a single job_title ─────
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS group_ids UUID[] NOT NULL DEFAULT '{}';

-- ── 2. accept_invitation now also returns the invitation's group_ids ──
DROP FUNCTION IF EXISTS public.accept_invitation(text);
CREATE OR REPLACE FUNCTION public.accept_invitation(p_code text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_inv   public.invitations%rowtype;
  v_rest  public.restaurants%rowtype;
BEGIN
  SELECT * INTO v_inv
  FROM public.invitations
  WHERE upper(code) = upper(p_code)
    AND used = false
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Kod nieważny lub wygasł');
  END IF;

  SELECT * INTO v_rest FROM public.restaurants WHERE id = v_inv.restaurant_id;

  RETURN json_build_object(
    'invitation_id',   v_inv.id,
    'restaurant_id',   v_inv.restaurant_id,
    'restaurant_name', v_rest.name,
    'job_title',       v_inv.job_title,
    'group_ids',       v_inv.group_ids
  );
END;
$$;

-- ── 3. mark_invitation_used now also assigns the new employee to the ──
--       invitation's groups (SECURITY DEFINER — an employee's own low-
--       privilege insert would otherwise be blocked by RLS, which only
--       allows owner/manager to write employee_group_assignments).
DROP FUNCTION IF EXISTS public.mark_invitation_used(text, uuid);
CREATE OR REPLACE FUNCTION public.mark_invitation_used(
  p_code       text,
  p_user_id    uuid,
  p_group_ids  uuid[] DEFAULT '{}'
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_restaurant_id uuid;
BEGIN
  UPDATE public.invitations
  SET used = true, used_by = p_user_id
  WHERE upper(code) = upper(p_code)
  RETURNING restaurant_id INTO v_restaurant_id;

  IF v_restaurant_id IS NOT NULL AND array_length(p_group_ids, 1) > 0 THEN
    INSERT INTO public.employee_group_assignments (employee_id, group_id)
    SELECT p_user_id, g.id
    FROM public.employee_groups g
    WHERE g.id = ANY(p_group_ids) AND g.restaurant_id = v_restaurant_id
    ON CONFLICT (employee_id, group_id) DO NOTHING;
  END IF;
END;
$$;

-- ── 4. admin_create_employee: drop the required job_title, add groups ──
DROP FUNCTION IF EXISTS public.admin_create_employee(uuid, text, text, text, text, text);
CREATE OR REPLACE FUNCTION public.admin_create_employee(
  p_user_id    UUID,
  p_first_name TEXT,
  p_last_name  TEXT,
  p_role       TEXT DEFAULT 'employee',
  p_phone      TEXT DEFAULT NULL,
  p_group_ids  UUID[] DEFAULT '{}',
  p_job_title  TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role  TEXT;
  v_restaurant   UUID;
  v_role         TEXT;
  v_colors       TEXT[] := ARRAY['#2196C9','#22C55E','#F97316','#A855F7','#EAB308','#EF4444','#0F172A'];
  v_color        TEXT;
BEGIN
  SELECT role, restaurant_id INTO v_caller_role, v_restaurant
  FROM profiles WHERE id = auth.uid() LIMIT 1;

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner','manager') THEN
    RETURN json_build_object('success', false, 'error', 'Brak uprawnień do dodawania pracowników.');
  END IF;
  IF v_restaurant IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Brak przypisanej restauracji.');
  END IF;

  -- Only owners may create managers; managers can create employees only.
  v_role := CASE
    WHEN p_role = 'manager' AND v_caller_role = 'owner' THEN 'manager'
    ELSE 'employee'
  END;

  v_color := v_colors[1 + floor(random() * array_length(v_colors, 1))::int];

  INSERT INTO profiles (id, restaurant_id, first_name, last_name, role, job_title, phone, avatar_color, is_active)
  VALUES (p_user_id, v_restaurant, p_first_name, p_last_name, v_role, COALESCE(p_job_title, ''), COALESCE(p_phone, ''), v_color, true)
  ON CONFLICT (id) DO UPDATE
    SET restaurant_id = EXCLUDED.restaurant_id,
        first_name    = EXCLUDED.first_name,
        last_name     = EXCLUDED.last_name,
        role          = EXCLUDED.role,
        job_title     = EXCLUDED.job_title,
        phone         = EXCLUDED.phone;

  IF array_length(p_group_ids, 1) > 0 THEN
    INSERT INTO employee_group_assignments (employee_id, group_id)
    SELECT p_user_id, g.id
    FROM employee_groups g
    WHERE g.id = ANY(p_group_ids) AND g.restaurant_id = v_restaurant
    ON CONFLICT (employee_id, group_id) DO NOTHING;
  END IF;

  RETURN json_build_object('success', true, 'restaurant_id', v_restaurant, 'role', v_role);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_employee(UUID, TEXT, TEXT, TEXT, TEXT, UUID[], TEXT) TO authenticated;
-- ▲▲▲ 072_replace_job_title_with_groups.sql ▲▲▲

