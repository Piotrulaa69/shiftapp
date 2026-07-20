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
